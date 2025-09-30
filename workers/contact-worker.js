export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }
    if (url.pathname !== '/api/contact' || request.method !== 'POST') {
      return new Response('Not found', { status: 404, headers: corsHeaders() });
    }
    try {
      const body = await request.json();
      const name = (body.name || '').toString().slice(0, 120);
      const email = (body.email || '').toString().slice(0, 200);
      const message = (body.message || '').toString().slice(0, 8000);
      const to = 'contact@thelimbostudio.com';

      // Basic validation
      if (!name || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        return json({ ok: false, error: 'Invalid input' }, 400);
      }

      // --- Send via MailChannels ---
      const payload = {
        personalizations: [{ to: [{ email: to, name: 'The Limbo Studio' }] }],
        from: { email: 'contact@thelimbostudio.com', name: 'Limbo Studio Website' },
        reply_to: { email, name },
        subject: `New inquiry from ${name}`,
        content: [
          { type: 'text/plain', value: `From: ${name} <${email}>\n\n${message}` },
          { type: 'text/html', value: `<p><b>From:</b> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p><pre>${escapeHtml(message)}</pre>` }
        ]
      };

      const resp = await fetch('https://api.mailchannels.net/tx/v1/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        const t = await resp.text();
        return json({ ok: false, error: 'Mail send failed', detail: t }, 502);
      }

      return json({ ok: true });
    } catch (e) {
      return json({ ok: false, error: 'Invalid request' }, 400);
    }

    function json(obj, status = 200) {
      return new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...corsHeaders() } });
    }
    function corsHeaders() {
      return {
        'Access-Control-Allow-Origin': 'https://thelimbostudio.com',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type',
      };
    }
    function escapeHtml(s) {
      return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
  }
}