#!/bin/bash
# Limbo Studio Chat Widget - Quick Command Reference
# Copy and paste these commands for fast deployment

echo "🚀 Limbo Studio Chat Widget - Quick Deploy Commands"
echo "======================================================"
echo ""

# ============================================================================
# INITIAL SETUP
# ============================================================================

echo "📦 Step 1: Install Dependencies"
echo "--------------------------------"
echo "npm install"
echo ""

echo "🔨 Step 2: Build Knowledge Base"
echo "--------------------------------"
echo "npm run build-kb"
echo ""

echo "🗄️  Step 3: Create KV Namespace"
echo "--------------------------------"
echo "cd workers"
echo "wrangler kv:namespace create \"CHAT_KV\" --config wrangler-chat.toml"
echo "wrangler kv:namespace create \"CHAT_KV\" --preview --config wrangler-chat.toml"
echo ""
echo "⚠️  IMPORTANT: Copy the IDs returned and update workers/wrangler-chat.toml"
echo ""

echo "🔐 Step 4: Set OpenAI Secret"
echo "----------------------------"
echo "cd workers"
echo "wrangler secret put OPENAI_API_KEY --config wrangler-chat.toml"
echo ""

echo "🚀 Step 5: Deploy Chat Worker"
echo "------------------------------"
echo "cd workers"
echo "wrangler deploy --config wrangler-chat.toml"
echo ""

echo "✅ Step 6: Test Deployment"
echo "--------------------------"
echo "curl https://thelimbostudio.com/api/health"
echo ""
echo "curl -X POST https://thelimbostudio.com/api/chat \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"session_id\":\"test-001\",\"message\":\"What services do you offer?\",\"client_ts\":\"2025-10-03T12:00:00Z\"}'"
echo ""

echo "📝 Step 7: Add Widget to HTML"
echo "------------------------------"
echo "Add to index.html before </body>:"
echo "<script src=\"/assets/chat-widget.js\" defer></script>"
echo ""

echo "🌐 Step 8: Deploy Frontend"
echo "--------------------------"
echo "git add ."
echo "git commit -m \"Add AI chat widget\""
echo "git push origin main"
echo ""

# ============================================================================
# MONITORING COMMANDS
# ============================================================================

echo ""
echo "📊 MONITORING COMMANDS"
echo "======================================================"
echo ""

echo "View Real-Time Logs:"
echo "-------------------"
echo "wrangler tail limbo-chat --config wrangler-chat.toml --format pretty"
echo ""

echo "Check Today's Metrics:"
echo "---------------------"
echo "DATE=\$(date +%Y-%m-%d)"
echo "wrangler kv:key get \"metrics:query_classification:\$DATE\" --namespace-id=YOUR_KV_ID | jq '.'"
echo ""

echo "List All Sessions:"
echo "-----------------"
echo "wrangler kv:key list --namespace-id=YOUR_KV_ID --prefix=\"chat:sessions:\""
echo ""

echo "View Specific Session:"
echo "---------------------"
echo "wrangler kv:key get \"chat:sessions:SESSION_ID\" --namespace-id=YOUR_KV_ID | jq '.'"
echo ""

echo "Check Secrets:"
echo "-------------"
echo "wrangler secret list --config wrangler-chat.toml"
echo ""

echo "List Recent Deployments:"
echo "-----------------------"
echo "wrangler deployments list --config wrangler-chat.toml"
echo ""

# ============================================================================
# TROUBLESHOOTING COMMANDS
# ============================================================================

echo ""
echo "🔧 TROUBLESHOOTING COMMANDS"
echo "======================================================"
echo ""

echo "Clear Rate Limits (Testing):"
echo "----------------------------"
echo "wrangler kv:key list --namespace-id=YOUR_KV_ID --prefix=\"rl:ip:\""
echo "# Then delete specific keys if needed"
echo ""

echo "Reset Session (Browser Console):"
echo "--------------------------------"
echo "localStorage.removeItem('limbo_chat_session');"
echo ""

echo "Check Worker Status:"
echo "-------------------"
echo "wrangler deployments list --config wrangler-chat.toml"
echo ""

echo "View Error Logs Only:"
echo "--------------------"
echo "wrangler tail limbo-chat --config wrangler-chat.toml --status error"
echo ""

echo "Rollback Deployment:"
echo "-------------------"
echo "wrangler rollback --message \"Emergency rollback\" --config wrangler-chat.toml"
echo ""

# ============================================================================
# MAINTENANCE COMMANDS
# ============================================================================

echo ""
echo "🛠️  MAINTENANCE COMMANDS"
echo "======================================================"
echo ""

echo "Rebuild Knowledge Base:"
echo "----------------------"
echo "npm run build-kb"
echo "git add data/kb.json kb/"
echo "git commit -m \"Update knowledge base\""
echo "git push origin main"
echo ""

echo "Update Worker Code:"
echo "-------------------"
echo "# Edit workers/chat.js"
echo "cd workers"
echo "wrangler deploy --config wrangler-chat.toml"
echo ""

echo "Update Widget Code:"
echo "------------------"
echo "# Edit assets/chat-widget.js"
echo "git add assets/chat-widget.js"
echo "git commit -m \"Update chat widget\""
echo "git push origin main"
echo ""

echo "Add New KB Document:"
echo "-------------------"
echo "# Create new .md file in kb/services/"
echo "npm run build-kb"
echo "git add kb/ data/kb.json"
echo "git commit -m \"Add new service to KB\""
echo "git push origin main"
echo ""

# ============================================================================
# TESTING COMMANDS
# ============================================================================

echo ""
echo "🧪 TESTING COMMANDS"
echo "======================================================"
echo ""

echo "Test Simple Query:"
echo "-----------------"
echo "curl -X POST https://thelimbostudio.com/api/chat \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"session_id\":\"test-simple\",\"message\":\"What is your pricing?\",\"client_ts\":\"2025-10-03T12:00:00Z\"}'"
echo ""

echo "Test Complex Query:"
echo "------------------"
echo "curl -X POST https://thelimbostudio.com/api/chat \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"session_id\":\"test-complex\",\"message\":\"How should we approach AI implementation with HIPAA compliance?\",\"client_ts\":\"2025-10-03T12:00:00Z\"}'"
echo ""

echo "Test Escalation:"
echo "---------------"
echo "curl -X POST https://thelimbostudio.com/api/chat \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{\"session_id\":\"test-escalate\",\"message\":\"Create a complete 10-year AI transformation roadmap with financial modeling\",\"client_ts\":\"2025-10-03T12:00:00Z\"}'"
echo ""

echo "Test Rate Limit:"
echo "---------------"
echo "for i in {1..21}; do"
echo "  curl -X POST https://thelimbostudio.com/api/chat \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -d '{\"session_id\":\"test-rl\",\"message\":\"test '\$i'\",\"client_ts\":\"2025-10-03T12:00:00Z\"}'"
echo "done"
echo "# 21st request should return 429"
echo ""

# ============================================================================
# COST MONITORING
# ============================================================================

echo ""
echo "💰 COST MONITORING"
echo "======================================================"
echo ""

echo "Get Classification Breakdown:"
echo "----------------------------"
echo "DATE=\$(date +%Y-%m-%d)"
echo "wrangler kv:key get \"metrics:query_classification:\$DATE\" --namespace-id=YOUR_KV_ID | jq '.breakdown'"
echo ""

echo "Calculate Estimated Costs:"
echo "-------------------------"
echo "# Based on breakdown above:"
echo "# SIMPLE: count × 0.0002"
echo "# COMPLEX: count × 0.025"
echo "# ESCALATE: count × 0.0001"
echo "# CLASSIFICATION: total × 0.0001"
echo ""

# ============================================================================
# USEFUL LINKS
# ============================================================================

echo ""
echo "🔗 USEFUL LINKS"
echo "======================================================"
echo ""
echo "Cloudflare Dashboard:"
echo "https://dash.cloudflare.com/"
echo ""
echo "OpenAI Usage Dashboard:"
echo "https://platform.openai.com/usage"
echo ""
echo "Cloudflare Workers Logs:"
echo "https://dash.cloudflare.com/ → Workers & Pages → limbo-chat → Logs"
echo ""
echo "GitHub Actions:"
echo "https://github.com/imdoingsomething/thelimbostudio-site/actions"
echo ""
echo "Website:"
echo "https://thelimbostudio.com"
echo ""

# ============================================================================
# EMERGENCY PROCEDURES
# ============================================================================

echo ""
echo "🚨 EMERGENCY PROCEDURES"
echo "======================================================"
echo ""

echo "Disable Widget (Emergency):"
echo "--------------------------"
echo "# Edit assets/chat-widget.js, add at top:"
echo "const EMERGENCY_DISABLE = true;"
echo "if (EMERGENCY_DISABLE) { console.warn('Chat disabled'); return; }"
echo ""
echo "# Or remove script tag from index.html"
echo ""

echo "Rollback Worker:"
echo "---------------"
echo "wrangler deployments list --config wrangler-chat.toml"
echo "wrangler rollback --message \"Emergency rollback\" --config wrangler-chat.toml"
echo ""

echo "Stop Receiving Escalations:"
echo "--------------------------"
echo "# Edit workers/chat.js, find sendEscalationEmail()"
echo "# Add at top of function:"
echo "const PAUSE_ESCALATIONS = true;"
echo "if (PAUSE_ESCALATIONS) { return true; }"
echo ""

echo ""
echo "✅ COMMANDS READY TO USE"
echo "======================================================"
echo "Copy any command above and run in your terminal"
echo ""
