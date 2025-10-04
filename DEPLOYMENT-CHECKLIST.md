# Limbo Studio Chat Widget - Deployment Checklist

## 📋 Pre-Deployment Setup

### 1. File Structure Verification

Ensure these files exist in your repository:

```
thelimbostudio-site/
├── assets/
│   ├── chat-widget.js          ✅ Created
│   ├── script.js               ✅ Existing
│   ├── styles.css              ✅ Existing
│   └── logo.png                ✅ Existing
├── data/
│   └── kb.json                 ⚠️  Generate via npm run build-kb
├── kb/
│   ├── services/
│   │   ├── website-chatbot.md  ✅ Created
│   │   ├── document-automation.md ✅ Created
│   │   └── readiness-audit.md  ✅ Created
│   └── pricing/
│       └── pricing-bands.md    ✅ Created
├── scripts/
│   └── build-kb.js             ✅ Created
├── workers/
│   ├── chat.js                 ✅ Created
│   ├── contact-worker.js       ✅ Existing
│   ├── wrangler.toml           ✅ Existing (contact)
│   └── wrangler-chat.toml      ✅ Created (chat)
├── index.html                  ⚠️  Needs widget script tag
└── package.json                ✅ Created
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build Knowledge Base

```bash
npm run build-kb
```

Verify output:
- [ ] `data/kb.json` file created
- [ ] File size > 0 KB
- [ ] Contains all 4+ documents

### 4. Create Cloudflare KV Namespace

```bash
cd workers
wrangler kv:namespace create "CHAT_KV" --config wrangler-chat.toml
wrangler kv:namespace create "CHAT_KV" --preview --config wrangler-chat.toml
```

**Important**: Copy the namespace IDs returned and update `workers/wrangler-chat.toml`:

```toml
kv_namespaces = [
    { binding = "CHAT_KV", id = "PASTE_PRODUCTION_ID_HERE", preview_id = "PASTE_PREVIEW_ID_HERE" }
]
```

### 5. Set Cloudflare Secrets

```bash
cd workers
wrangler secret put OPENAI_API_KEY --config wrangler-chat.toml
```

When prompted, paste your OpenAI API key.

**Verify secrets are set:**
```bash
wrangler secret list --config wrangler-chat.toml
```

## 🚀 Deployment Steps

### Step 1: Deploy Chat Worker

```bash
cd workers
wrangler deploy --config wrangler-chat.toml
```

**Expected output:**
```
✨ Successfully deployed limbo-chat
🌎 https://limbo-chat.your-subdomain.workers.dev
```

### Step 2: Test Health Endpoint

```bash
curl https://thelimbostudio.com/api/health
```

**Expected response:**
```json
{"ok":true,"service":"limbo-chat","timestamp":1696070400000}
```

If you get a 404 or error:
- Check routes are configured in Cloudflare dashboard
- Verify worker deployed successfully
- Check DNS is proxied (orange cloud)

### Step 3: Test Chat Classification

```bash
curl -X POST https://thelimbostudio.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-001",
    "message": "What services does Limbo Studio offer?",
    "client_ts": "2025-10-03T12:00:00Z"
  }'
```

**Expected**: JSON response with `ok: true` and `reply_markdown` field.

### Step 4: Add Widget to Website

Edit `index.html` and add before closing `</body>` tag:

```html


```

### Step 5: Deploy Frontend

```bash
git add .
git commit -m "Add AI chat widget"
git push origin main
```

GitHub Actions will auto-deploy to Pages.

### Step 6: Verify Widget Loads

1. Visit https://thelimbostudio.com
2. Check browser console for errors
3. Verify chat widget appears in bottom-right corner
4. Click to open chat panel
5. Try a starter prompt

## ✅ Post-Deployment Verification

### Frontend Tests

- [ ] Widget toggle button appears
- [ ] Clicking toggle opens panel
- [ ] Panel shows welcome message
- [ ] All 5 starter prompts visible
- [ ] Input field accepts text
- [ ] Send button is clickable
- [ ] Widget is responsive on mobile (test on 375px width)

### Backend Tests

- [ ] Health endpoint returns 200
- [ ] Chat endpoint accepts messages
- [ ] Classification returns valid responses
- [ ] Rate limiting works (try 21 requests from same IP)
- [ ] Sessions persist across page reloads
- [ ] Escalation emails deliver to contact@thelimbostudio.com

### Integration Tests

- [ ] Click starter prompt → bot responds
- [ ] Type message → bot responds
- [ ] Follow-up questions maintain context
- [ ] Complex query triggers correct routing
- [ ] Very complex query shows escalation message
- [ ] Escalation auto-sends email
- [ ] Transcript email feature works
- [ ] No console errors in browser

## 🔧 Troubleshooting

### Widget Doesn't Appear

1. Check browser console for errors
2. Verify script tag in index.html
3. Clear browser cache (Cmd+Shift+R)
4. Check /assets/chat-widget.js loads (200 status)

### Chat API Returns 404

1. Verify worker deployed: `wrangler deployments list --config wrangler-chat.toml`
2. Check routes in Cloudflare dashboard
3. Ensure DNS is proxied (orange cloud)
4. Wait 60 seconds for DNS propagation

### OpenAI API Errors

1. Verify secret is set: `wrangler secret list --config wrangler-chat.toml`
2. Check API key is valid on OpenAI dashboard
3. Ensure billing is active on OpenAI account
4. Check model names are correct (gpt-4o-mini, gpt-4-turbo-2024-04-09)

### Email Not Sending

1. Verify SEB binding is configured in wrangler-chat.toml
2. Check Cloudflare Email Routing is set up for domain
3. Test with existing contact form to verify email routing works
4. Check worker logs: `wrangler tail limbo-chat --config wrangler-chat.toml`

### Rate Limit Errors

For testing, clear rate limits:
```bash
# Clear session
localStorage.removeItem('limbo_chat_session');

# Or manually delete KV keys
wrangler kv:key list --namespace-id=YOUR_KV_ID --prefix="rl:ip:"
```

## 📊 Monitoring

### View Real-Time Logs

```bash
wrangler tail limbo-chat --config wrangler-chat.toml --format pretty
```

### Check Daily Metrics

```bash
DATE=$(date +%Y-%m-%d)
wrangler kv:key get "metrics:query_classification:$DATE" \
  --namespace-id=YOUR_KV_ID | jq '.'
```

### CloudFlare Dashboard

1. Go to Workers & Pages → limbo-chat
2. Check Analytics tab for request volume
3. Check Logs → Real-time Logs for errors
4. Monitor CPU time and invocations

## 🎯 Success Criteria

Before marking deployment complete:

- [ ] Widget appears on all pages
- [ ] At least 1 test conversation completed end-to-end
- [ ] Escalation email received and verified
- [ ] No JavaScript errors in console
- [ ] Mobile responsive (tested on actual device or 375px)
- [ ] Health endpoint returns 200
- [ ] Rate limiting enforced
- [ ] Knowledge base returns relevant results
- [ ] Transcript email delivers successfully

## 📈 Next Steps After Launch

1. **Monitor for 24 hours**
   - Check error rates hourly
   - Review first 10 conversations manually
   - Verify no critical bugs

2. **Gather Feedback**
   - Review escalation emails for quality
   - Check classification accuracy
   - Look for patterns in user queries

3. **Optimize**
   - Tune classification prompts if needed
   - Expand knowledge base with common questions
   - Adjust rate limits based on usage

4. **Week 1 Review**
   - Calculate actual costs vs. estimates
   - Measure engagement rate (% visitors who open chat)
   - Track completion rate (% who reach recommendation)
   - Assess lead quality from escalations

---

**Deployment Date**: _________  
**Deployed By**: _________  
**Verified By**: _________  
**Status**: [ ] In Progress  [ ] Complete  [ ] Issues Found
