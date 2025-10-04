// Limbo Studio Chat Worker (Resend API version)
// Handles conversational AI for project scoping and qualification

// Model configuration
const MODEL_CONFIG = {
  classification: 'gpt-4o-mini',
  simple: 'gpt-4o-mini',
  complex: 'gpt-4-turbo-2024-04-09'
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname === '/api/chat' && request.method === 'POST') {
      return handleChat(request, env);
    }

    if (url.pathname === '/api/send-transcript' && request.method === 'POST') {
      return handleSendTranscript(request, env);
    }

    if (url.pathname === '/api/health') {
      return json({ ok: true, service: 'limbo-chat', timestamp: Date.now() });
    }

    return new Response('Not found', { status: 404, headers: corsHeaders() });
  }
};

async function handleChat(request, env) {
  try {
    const body = await request.json();
    const { session_id, message, starter } = body;

    if (!session_id || (!message && !starter)) {
      return json({ ok: false, error: 'Invalid request' }, 400);
    }

    const sanitizedMessage = sanitizeInput(message || getStarterMessage(starter));
    if (sanitizedMessage.length > 1000) {
      return json({ ok: false, error: 'Message too long' }, 400);
    }

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimitOk = await checkRateLimit(env, ip, session_id);
    if (!rateLimitOk) {
      return json({
        ok: false,
        error: 'RATE_LIMIT',
        reply_markdown: 'You\'ve reached the rate limit. Please try again in an hour or email us at contact@thelimbostudio.com'
      }, 429);
    }

    const session = await getSession(env, session_id);
    const userMessage = starter ? getStarterMessage(starter) : message;

    session.turns.push({ u: truncate(userMessage, 200) });
    session.count = (session.count || 0) + 1;
    session.lastAt = Date.now();

    const kbContext = await retrieveKBContext(env, userMessage, starter);
    const prompt = buildPrompt(session, userMessage, kbContext);

    const classification = await classifyQuery(env, userMessage, session);
    await logEvent(env, 'query_classification', {
      classification,
      message_preview: maskPII(userMessage.slice(0, 100))
    });

    let completion;
    let isEscalation = false;

    if (classification === 'VERY_COMPLEX') {
      completion = buildEscalationResponse();
      isEscalation = true;

      const alreadySent = await env.CHAT_KV.get(`escalation:sent:${session_id}`);
      if (!alreadySent) {
        try {
          await sendEscalationEmail(env, session_id, session, userMessage, completion);
          await logEvent(env, 'auto_escalation_sent', { session_id });
        } catch (emailError) {
          console.error('Failed to send escalation email:', emailError);
        }
      }
    } else {
      const model = classification === 'COMPLEX' ? MODEL_CONFIG.complex : MODEL_CONFIG.simple;
      completion = await callOpenAI(env, prompt, model);
      await logEvent(env, 'llm_call', {
        classification,
        model_used: model,
        session_count: session.count
      });
    }

    const { reply_markdown, plan, step, is_final } = parseCompletion(completion, isEscalation);

    session.turns.push({ a: truncate(reply_markdown, 200) });
    if (session.turns.length > 4) {
      session.turns = session.turns.slice(-4);
    }
    session.summary = generateSummary(session);

    await saveSession(env, session_id, session);
    await logEvent(env, 'chat_turn', { session_id, step });

    return json({
      ok: true,
      reply_markdown,
      plan,
      is_final,
      step
    });

  } catch (error) {
    console.error('Chat error:', error);
    return json({
      ok: false,
      error: 'Internal error',
      reply_markdown: 'Sorry, something went wrong. Please try again or contact us at contact@thelimbostudio.com'
    }, 500);
  }
}

async function handleSendTranscript(request, env) {
  try {
    const body = await request.json();
    const { session_id, visitor_email, consent, transcript, plan } = body;

    if (!consent || !transcript || !Array.isArray(transcript)) {
      return json({ ok: false, error: 'Invalid request' }, 400);
    }

    const emailSent = await env.CHAT_KV.get(`email:sent:${session_id}`);
    if (emailSent) {
      return json({
        ok: false,
        error: 'Already sent',
        message: 'Transcript already sent for this session'
      }, 429);
    }

    const emailBody = formatTranscriptEmail(transcript, plan, visitor_email);
    const success = await sendEmailViaCF(env, emailBody, visitor_email);

    if (!success) {
      return json({ ok: false, error: 'Email failed' }, 502);
    }

    await env.CHAT_KV.put(`email:sent:${session_id}`, Date.now().toString(), {
      expirationTtl: 86400
    });

    await logEvent(env, 'transcript_sent', {
      session_id,
      has_visitor_email: !!visitor_email
    });

    const ticket_id = `LC-${new Date().toISOString().split('T')[0]}-${session_id.slice(-6)}`;
    return json({ ok: true, ticket_id });

  } catch (error) {
    console.error('Send transcript error:', error);
    return json({ ok: false, error: 'Internal error' }, 500);
  }
}

async function getSession(env, session_id) {
  const key = `chat:sessions:${session_id}`;
  const stored = await env.CHAT_KV.get(key);

  if (stored) {
    return JSON.parse(stored);
  }

  return {
    summary: '',
    turns: [],
    count: 0,
    createdAt: Date.now(),
    lastAt: Date.now()
  };
}

async function saveSession(env, session_id, session) {
  const key = `chat:sessions:${session_id}`;
  await env.CHAT_KV.put(key, JSON.stringify(session), {
    expirationTtl: 86400
  });
}

async function checkRateLimit(env, ip, session_id) {
  const now = Date.now();
  const hour = Math.floor(now / 3600000);

  const ipKey = `rl:ip:${ip}:${hour}`;
  const ipCount = parseInt(await env.CHAT_KV.get(ipKey) || '0');

  if (ipCount >= 20) {
    return false;
  }

  await env.CHAT_KV.put(ipKey, (ipCount + 1).toString(), {
    expirationTtl: 3600
  });

  const session = await getSession(env, session_id);
  if (session.count >= 12) {
    return false;
  }

  return true;
}

async function retrieveKBContext(env, message, starter) {
  try {
    const kbResponse = await fetch('https://thelimbostudio.com/data/kb.json');
    if (!kbResponse.ok) {
      console.warn('KB not available');
      return '';
    }

    const kb = await kbResponse.json();
    const keywords = extractKeywords(message, starter);

    const scored = kb.documents.map(doc => ({
      ...doc,
      score: scoreDocument(doc, keywords)
    }));

    scored.sort((a, b) => b.score - a.score);
    const topDocs = scored.slice(0, 2);

    return topDocs
      .filter(d => d.score > 0)
      .map(d => `[${d.title}]\n${d.body_md.slice(0, 400)}`)
      .join('\n\n---\n\n');
  } catch (error) {
    console.error('KB retrieval error:', error);
    return '';
  }
}

function extractKeywords(message, starter) {
  const text = (message || '').toLowerCase();
  const keywords = new Set();

  if (starter) {
    const starterKW = {
      'describe': ['discovery', 'planning', 'roadmap'],
      'doc-chaos': ['document', 'workflow', 'automation', 'routing'],
      'site-bot': ['chatbot', 'website', 'support', 'customer'],
      'ai-site': ['website', 'web', 'development', 'platform'],
      'schedule': ['scheduling', 'calendar', 'assistant', 'automation']
    };

    (starterKW[starter] || []).forEach(kw => keywords.add(kw));
  }

  const terms = ['chatbot', 'website', 'document', 'schedule', 'automation',
                 'support', 'customer', 'workflow', 'dashboard', 'training',
                 'rag', 'llm', 'ai', 'pilot', 'architecture'];

  terms.forEach(term => {
    if (text.includes(term)) keywords.add(term);
  });

  return Array.from(keywords);
}

function scoreDocument(doc, keywords) {
  let score = 0;
  const searchText = `${doc.title} ${doc.tags.join(' ')} ${doc.keywords.join(' ')} ${doc.body_md}`.toLowerCase();

  keywords.forEach(kw => {
    if (searchText.includes(kw)) score += 1;
  });

  return score;
}

async function classifyQuery(env, userMessage, session) {
  const contextSummary = session.summary || 'First message';
  const turnCount = session.count || 0;

  const classificationPrompt = `Classify this customer request as SIMPLE, COMPLEX, or VERY_COMPLEX.

CLASSIFICATION RULES:

SIMPLE - Choose this for:
- Factual questions about services, pricing, or timelines
- Requests for definitions or explanations of concepts
- General questions about AI consulting or implementation
- Straightforward comparisons (DIY vs professional help)

COMPLEX - Choose this for:
- Strategic planning questions requiring multi-step reasoning
- Technical architecture decisions with multiple considerations
- Implementation approaches that need nuanced judgment
- Questions involving compliance, regulations, or risk assessment
- Comparing multiple approaches with tradeoffs
- Follow-up questions that build on complex previous topics

VERY_COMPLEX - Choose this for:
- Custom multi-year roadmaps with financial modeling
- Major business decisions (acquisitions, large investments, partnerships)
- Highly specific industry expertise beyond general consulting
- Legal or regulatory advice requiring attorney review
- Enterprise proposals requiring extensive custom scoping
- Questions explicitly requesting deliverables like "create a complete plan"

CONTEXT:
Conversation turn: ${turnCount + 1}
Previous context: ${contextSummary}

USER REQUEST:
${userMessage}

Respond with valid JSON only:
{
  "classification": "SIMPLE" | "COMPLEX" | "VERY_COMPLEX",
  "reasoning": "Brief explanation of why"
}`;

  try {
    const response = await callOpenAI(env, classificationPrompt, MODEL_CONFIG.classification, true);
    const parsed = JSON.parse(response);
    const classification = parsed.classification?.toUpperCase().replace(/[^A-Z_]/g, '');

    if (['SIMPLE', 'COMPLEX', 'VERY_COMPLEX'].includes(classification)) {
      console.log(`Classification: ${classification} - ${parsed.reasoning || 'no reason'}`);
      return classification;
    }

    console.warn('Invalid classification:', parsed);
    return 'SIMPLE';

  } catch (error) {
    console.error('Classification error:', error);
    return 'SIMPLE';
  }
}

async function callOpenAI(env, prompt, model, isClassification = false) {
  const messages = isClassification ? [
    {
      role: 'system',
      content: 'You are a classification system. Return only valid JSON with classification and reasoning fields.'
    },
    { role: 'user', content: prompt }
  ] : [
    {
      role: 'system',
      content: 'You are a helpful AI assistant for The Limbo Studio, a bespoke AI consultancy.'
    },
    { role: 'user', content: prompt }
  ];

  const requestBody = {
    model: model,
    max_tokens: isClassification ? 100 : 2000,
    temperature: isClassification ? 0 : 0.7,
    messages: messages
  };

  if (isClassification) {
    requestBody.response_format = { type: 'json_object' };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.OPENAI_API_KEY}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('OpenAI API error:', response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function buildEscalationResponse() {
  const messages = [
    {
      emoji: '🚨',
      title: "This one's above my pay grade!",
      hook: "Don't worry—we'll bring coffee and way too many sticky notes. 😉"
    },
    {
      emoji: '🎯',
      title: "You've unlocked: Human Expert Mode!",
      hook: "Our team loves these kinds of challenges—consider them caffeinated and ready. ☕"
    },
    {
      emoji: '🚀',
      title: "Houston, we need a human!",
      hook: "Your question deserves the full Limbo Studio brain trust (Post-its included). 📝"
    }
  ];

  const variant = messages[Date.now() % 3];

  return `${variant.emoji} ${variant.title}

I can guide you on many things, but this request is best handled by a human at Limbo Studio. Your question requires the kind of deep expertise and custom judgment that goes beyond what I can provide in this chat.

**Good news**: I've automatically sent this conversation to our team at contact@thelimbostudio.com, so they already have all the context.

Someone will reach out within 24 hours to dive into this with you personally.

${variant.hook}

In the meantime, is there anything else I can help you explore?`;
}

function buildPrompt(session, userMessage, kbContext) {
  return `You are an AI assistant for The Limbo Studio, a bespoke AI consultancy. Your role is to:

1. Ask clarifying questions (max 2 at a time, max 4 total) to understand the user's project
2. Provide a structured plan comparing DIY, Hybrid, and Limbo Studio options
3. Stay strictly within Limbo Studio's service scope:
   - AI Readiness & Roadmap audits
   - System Architecture & Prototyping
   - Implementation & Training
   - Document automation & workflows
   - Chatbots & customer support AI
   - Dashboards & analytics
   - Governance & compliance

IMPORTANT RULES:
- Keep responses conversational and helpful, not salesy
- If asked about something outside our scope, politely redirect
- Use the knowledge base context provided to ground your responses
- When ready to recommend, output BOTH readable text AND a JSON plan

PRICING BANDS (reference only, confirm in discovery):
- Readiness: 1-2 weeks, $1.5-3k
- Architecture: 1-3 weeks, $2.5-6k
- Implementation (light): 2-4 weeks, $4-8k
- Implementation (complex): 4-8 weeks, $8-18k

KNOWLEDGE BASE CONTEXT:
${kbContext || 'No specific KB articles matched.'}

---

CONVERSATION HISTORY:
${session.summary || 'New conversation.'}
Recent turns: ${JSON.stringify(session.turns.slice(-4))}

USER MESSAGE: ${userMessage}

Respond naturally. If you're ready to provide a recommendation, include a JSON block at the end with this structure:
\`\`\`json
{
  "step": "ask|recommend|final",
  "plan": {
    "problem_statement": "...",
    "diy_option": {
      "tools": ["..."],
      "effort_hours": 0,
      "est_cost_usd_monthly": 0
    },
    "limbo_option": {
      "timeline_weeks_total": 0,
      "price_band_usd": "X-Yk"
    }
  }
}
\`\`\``;
}

function parseCompletion(completion, isEscalation = false) {
  if (isEscalation) {
    return {
      reply_markdown: completion,
      plan: null,
      step: 'escalation',
      is_final: false
    };
  }

  const jsonMatch = completion.match(/```json\s*([\s\S]*?)\s*```/);

  let plan = null;
  let step = 'ask';
  let reply_markdown = completion;

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      plan = parsed.plan;
      step = parsed.step || 'recommend';
      reply_markdown = completion.replace(/```json[\s\S]*?```/, '').trim();
    } catch (e) {
      console.error('JSON parse error:', e);
    }
  }

  const is_final = step === 'final' || (step === 'recommend' && plan);

  return { reply_markdown, plan, step, is_final };
}

async function sendEscalationEmail(env, sessionId, session, triggerMessage, escalationResponse) {
  const transcript = [];

  session.turns.forEach(turn => {
    if (turn.u) transcript.push({ role: 'user', content: turn.u });
    if (turn.a) transcript.push({ role: 'assistant', content: turn.a });
  });

  transcript.push({ role: 'user', content: triggerMessage });
  transcript.push({ role: 'assistant', content: escalationResponse });

  const emailBody = formatEscalationEmail(transcript, sessionId, session);

  try {
    await sendEmailViaCF(env, emailBody, null, `🚨 High-Value Lead: Escalated Chat [${sessionId.slice(-6)}]`);

    await env.CHAT_KV.put(`escalation:sent:${sessionId}`, Date.now().toString(), {
      expirationTtl: 604800
    });

    return true;
  } catch (error) {
    console.error('Escalation email error:', error);
    return false;
  }
}

async function sendEmailViaCF(env, htmlContent, replyTo = null, customSubject = null) {
  const to = env.EMAIL_TO || 'contact@thelimbostudio.com';
  const subject = customSubject || 'New AI Chat Lead';

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Limbo Studio Chat <noreply@thelimbostudio.com>',
        to: [to],
        subject: subject,
        html: htmlContent,
        reply_to: replyTo || undefined
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Resend API error:', response.status, errorText);
      return false;
    }

    const data = await response.json();
    console.log('Email sent successfully:', data.id);
    return true;
  } catch (e) {
    console.error('Email send error:', e);
    return false;
  }
}

function formatEscalationEmail(transcript, sessionId, session) {
  const transcriptHtml = transcript
    .map(t => {
      const role = t.role === 'user' ? 'Visitor' : 'AI Assistant';
      const content = escapeHtml(t.content);
      return `<div style="margin: 16px 0; padding: 12px; background: ${t.role === 'user' ? '#f0f8ff' : '#f5f5f5'}; border-left: 3px solid ${t.role === 'user' ? '#5bb3ff' : '#a58cff'};">
        <strong>${role}:</strong><br/>
        ${content.replace(/\n/g, '<br/>')}
      </div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>High-Value Escalation</title></head>
<body style="font-family: Inter, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #dc3545, #c82333); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; color: white;">🚨 High-Value Lead: Escalated Chat</h1>
  </div>

  <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 12px 12px;">
    <div style="background: #fff9e6; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <h3 style="margin-top: 0;">⚡ Metadata</h3>
      <p><strong>Session ID:</strong> ${escapeHtml(sessionId)}</p>
      <p><strong>Total Turns:</strong> ${session.count}</p>
      <p><strong>Escalated:</strong> ${new Date().toLocaleString()}</p>
    </div>

    <h2>Full Conversation</h2>
    ${transcriptHtml}

    <div style="background: #e6f7ff; padding: 16px; border-radius: 8px; margin-top: 24px;">
      <h3 style="margin-top: 0;">📋 Next Steps</h3>
      <ul>
        <li>Review conversation and assess complexity</li>
        <li>Reach out within 24 hours</li>
        <li>Prepare custom proposal if needed</li>
      </ul>
    </div>
  </div>
</body>
</html>`;
}

function formatTranscriptEmail(transcript, plan, visitorEmail) {
  const transcriptHtml = transcript
    .map(t => {
      const role = t.role === 'user' ? 'Visitor' : 'AI Assistant';
      const content = escapeHtml(t.content);
      return `<div style="margin: 16px 0; padding: 12px; background: ${t.role === 'user' ? '#f0f8ff' : '#f5f5f5'}; border-left: 3px solid ${t.role === 'user' ? '#5bb3ff' : '#a58cff'};">
        <strong>${role}:</strong><br/>
        ${content.replace(/\n/g, '<br/>')}
      </div>`;
    })
    .join('');

  let planHtml = '';
  if (plan) {
    planHtml = `<h2>Generated Plan</h2>
      <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
        <h3>DIY Option</h3>
        <p><strong>Tools:</strong> ${plan.diy_option?.tools?.join(', ') || 'N/A'}</p>
        <p><strong>Effort:</strong> ${plan.diy_option?.effort_hours || 0} hours</p>

        <h3>Limbo Studio Option</h3>
        <p><strong>Timeline:</strong> ${plan.limbo_option?.timeline_weeks_total || 0} weeks</p>
        <p><strong>Price Band:</strong> ${plan.limbo_option?.price_band_usd || 'TBD'}</p>
      </div>`;
  }

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>New Chat Lead</title></head>
<body style="font-family: Inter, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #8ecbff, #a58cff); padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
    <h1 style="margin: 0; color: #0b0f14;">🤖 New AI Chat Lead</h1>
    ${visitorEmail ? `<p style="margin: 8px 0 0;"><strong>From:</strong> ${escapeHtml(visitorEmail)}</p>` : ''}
  </div>

  <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-radius: 0 0 12px 12px;">
    <h2>Conversation Transcript</h2>
    ${transcriptHtml}
    ${planHtml}
    <p style="margin-top: 24px; font-size: 14px; color: #666;">
      <strong>Timestamp:</strong> ${new Date().toLocaleString()}
    </p>
  </div>
</body>
</html>`;
}

function sanitizeInput(input) {
  if (!input || typeof input !== 'string') return '';

  let sanitized = input
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();

  return sanitized.slice(0, 2000);
}

function maskPII(text) {
  return text
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')
    .replace(/(\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})/g, '[PHONE]')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]')
    .replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CC]');
}

function getStarterMessage(starter) {
  const messages = {
    'describe': 'I need help describing my project and figuring out what AI solutions would work',
    'doc-chaos': 'Our document handling is chaotic. Can Limbo help us automate and organize it?',
    'site-bot': 'What would it cost to add an AI chatbot to handle customer questions on our website?',
    'ai-site': 'I want to build a website with AI capabilities - personalization, recommendations, etc.',
    'schedule': 'I need an AI system to manage my schedule and handle meeting requests automatically'
  };
  return messages[starter] || starter;
}

function generateSummary(session) {
  const turnCount = session.count;
  const recentTopics = session.turns
    .slice(-4)
    .map(t => t.u || t.a)
    .join(' ')
    .slice(0, 300);

  return `[${turnCount} turns] ${recentTopics}`;
}

function truncate(str, maxLen) {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '...' : str;
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function logEvent(env, eventType, data) {
  console.log(`[${eventType}]`, JSON.stringify({ timestamp: new Date().toISOString(), ...data }));

  if (eventType === 'query_classification' || eventType === 'llm_call') {
    const metricsKey = `metrics:${eventType}:${new Date().toISOString().split('T')[0]}`;
    const existing = await env.CHAT_KV.get(metricsKey);
    const metrics = existing ? JSON.parse(existing) : { count: 0, breakdown: {} };

    metrics.count++;
    if (data.classification) {
      metrics.breakdown[data.classification] = (metrics.breakdown[data.classification] || 0) + 1;
    }
    if (data.model_used) {
      metrics.breakdown[data.model_used] = (metrics.breakdown[data.model_used] || 0) + 1;
    }

    await env.CHAT_KV.put(metricsKey, JSON.stringify(metrics), {
      expirationTtl: 604800
    });
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders()
    }
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': 'https://thelimbostudio.com',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}
