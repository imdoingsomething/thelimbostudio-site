import { EmailMessage } from "cloudflare:email";

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

      // --- Send via Cloudflare Email Routing ---
      // Build simple MIME message
      const boundary = '----boundary' + Date.now();
      const mimeContent = [
        `From: Limbo Studio Website <noreply@thelimbostudio.com>`,
        `To: ${to}`,
        `Reply-To: ${email}`,
        `Subject: New inquiry from ${name}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/alternative; boundary="${boundary}"`,
        ``,
        `--${boundary}`,
        `Content-Type: text/plain; charset=utf-8`,
        ``,
        `From: ${name} <${email}>`,
        ``,
        `${message}`,
        ``,
        `---`,
        `This message was sent from the contact form at thelimbostudio.com`,
        `--${boundary}`,
        `Content-Type: text/html; charset=utf-8`,
        ``,
        `<p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>`,
        `<pre>${escapeHtml(message)}</pre>`,
        `<hr>`,
        `<p><small>This message was sent from the contact form at thelimbostudio.com</small></p>`,
        `--${boundary}--`
      ].join('\r\n');

      try {
        const emailMessage = new EmailMessage(
          'noreply@thelimbostudio.com',
          to,
          mimeContent
        );

        await env.SEB.send(emailMessage);
        return json({ ok: true });
      } catch (e) {
        console.error('Email send error:', e);
        return json({ ok: false, error: 'Mail send failed', detail: e.message }, 502);
      }
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