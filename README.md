# The Limbo Studio Website

A modern, responsive website for The Limbo Studio - a bespoke AI consultancy. Built with vanilla HTML/CSS/JavaScript and deployed on GitHub Pages with a Cloudflare Worker handling contact form submissions.

## 🏗️ Architecture

### Frontend
- **Hosting**: GitHub Pages (https://thelimbostudio.com)
- **Repository**: `imdoingsomething/thelimbostudio-site`
- **Tech Stack**:
  - Vanilla HTML5
  - CSS3 (modern grid/flexbox layouts)
  - Vanilla JavaScript (no frameworks)
  - Google Fonts (Inter)

### Backend
- **Cloudflare Worker**: `applimbostudio`
- **Route**: `thelimbostudio.com/api/contact`
- **Email Service**: Resend API
- **Worker Runtime**: Cloudflare Workers (V8 isolates)

## 📁 Project Structure

```
thelimbostudio-site/
├── index.html              # Main website HTML
├── assets/
│   ├── script.js          # Frontend JavaScript (menu, form handling)
│   ├── styles.css         # Website styling
│   ├── logo.png          # The Limbo Studio logo
│   └── limbologo.png     # Alternative logo
├── workers/
│   ├── contact-worker.js  # Cloudflare Worker for contact form
│   └── wrangler.toml     # Worker configuration
└── README.md             # This file
```

## 🔧 Contact Form System

### Flow
1. User submits form on website
2. Frontend JavaScript (`/assets/script.js`) sends POST to `/api/contact`
3. Request hits Cloudflare Worker at route `thelimbostudio.com/api/contact`
4. Worker validates input and calls Resend API
5. Resend sends email from `noreply@thelimbostudio.com`
6. Email delivered to `contact@thelimbostudio.com` (ProtonMail)

### Worker Details (`workers/contact-worker.js`)
- **Runtime**: Cloudflare Workers
- **Language**: JavaScript (ES6+)
- **API**: Resend REST API
- **Features**:
  - CORS headers configured for `https://thelimbostudio.com`
  - Input validation (name, email format, message length)
  - HTML & plain text email formatting
  - Reply-To header set to form submitter
  - Error logging to Cloudflare Worker logs

### Configuration (`workers/wrangler.toml`)
```toml
name = "applimbostudio"
main = "contact-worker.js"
compatibility_date = "2024-01-01"

routes = [
    { pattern = "thelimbostudio.com/api/contact", custom_domain = false }
]
```

**Note**: The `RESEND_API_KEY` is stored as a Cloudflare Worker secret (not in wrangler.toml) for security.

## 🌐 DNS & Email Configuration

### Domain: thelimbostudio.com
- **DNS**: Managed by Cloudflare
- **Email Provider**: ProtonMail (for receiving)
- **Email Sending**: Resend API

### DNS Records
- **MX Records** (ProtonMail):
  - `mail.protonmail.ch` (Priority 10)
  - `mailsec.protonmail.ch` (Priority 20)

- **Resend Records** (for sending):
  - SPF: `v=spf1 include:_spf.resend.com ~all`
  - DKIM: Custom record provided by Resend
  - DMARC: `v=DMARC1; p=none;`

### Cloudflare Configuration
- **WAF Custom Rule**: Skip security checks for `/api/contact` path
  - Allows POST requests without bot challenge
  - Required for worker route to function

## 🚀 Deployment

### Frontend (GitHub Pages)
```bash
git add .
git commit -m "Update site"
git push origin main
```
GitHub Pages automatically deploys from `main` branch.

### Worker (Cloudflare)
```bash
cd workers/
npx wrangler deploy
```

**Prerequisites**:
- Node.js v20+
- Cloudflare API Token with Workers permissions
- Set environment variable: `export CLOUDFLARE_API_TOKEN=your_token`

## 🔑 Environment Variables & Secrets

### Cloudflare Worker
- `RESEND_API_KEY`: Resend API key (stored as Worker secret, not in code)

To set the secret:
```bash
cd workers
npx wrangler secret put RESEND_API_KEY
# Enter the API key when prompted
```

### Local Development
```bash
export CLOUDFLARE_API_TOKEN=your_cloudflare_token
export NVM_DIR="$HOME/.nvm"
source "$NVM_DIR/nvm.sh"
nvm use 20
```

## 📧 Email Services

### Resend (Contact Form Sending)
- **Account**: alextosborn@gmail.com
- **Verified Domain**: thelimbostudio.com
- **Free Tier**: 100 emails/day, 3,000/month
- **API Endpoint**: `https://api.resend.com/emails`
- **Sender**: `noreply@thelimbostudio.com`

### ProtonMail (Receiving)
- **Email**: contact@thelimbostudio.com
- **Configuration**: Custom domain with MX records
- **Receives**: All contact form submissions + regular emails

## 🛡️ Security

### CORS Policy
- **Allowed Origin**: `https://thelimbostudio.com`
- **Allowed Methods**: `POST, OPTIONS`
- **Allowed Headers**: `content-type`

### Input Validation
- Name: Max 120 characters
- Email: Max 200 characters, regex validated
- Message: Max 8000 characters
- HTML escaping on all user input

### Rate Limiting
- Cloudflare automatically applies rate limiting
- Resend free tier: 100 emails/day

## 🔍 Monitoring & Debugging

### Cloudflare Worker Logs
View real-time logs:
1. Go to Cloudflare Dashboard
2. Navigate to Workers & Pages → applimbostudio
3. Click on "Logs" → "Real-time Logs"

### Testing Locally
```bash
# Test the contact endpoint
curl -X POST https://thelimbostudio.com/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"Test message"}'
```

Expected response: `{"ok":true}`

## 📝 Development Notes

### Design System
- **Colors**: CSS custom properties in `:root`
- **Typography**: Inter font family (300-900 weights)
- **Layout**: CSS Grid + Flexbox
- **Mobile**: Responsive with hamburger menu

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript required
- CSS Grid & Flexbox support required

## 🐛 Troubleshooting

### Contact Form Not Working
1. Check Cloudflare Worker logs for errors
2. Verify Resend API key is valid
3. Check WAF rules aren't blocking `/api/contact`
4. Verify DNS records are correct

### Email Not Received
1. Check spam folder
2. Verify ProtonMail MX records
3. Check Resend dashboard for delivery status
4. Ensure domain is verified in Resend

### Worker Deploy Fails
1. Ensure Node.js v20+ is installed
2. Set `CLOUDFLARE_API_TOKEN` environment variable
3. Check wrangler.toml syntax
4. Verify API token has Workers permissions

## 📚 Dependencies

### Frontend
- None (vanilla JavaScript)

### Worker
- `wrangler` (Cloudflare CLI tool)
- Node.js 20+

### External Services
- GitHub Pages (hosting)
- Cloudflare (DNS, WAF, Workers)
- Resend (email sending)
- ProtonMail (email receiving)

## 📄 License

Copyright © 2025 The Limbo Studio. All rights reserved.

## 👤 Contact

- Website: https://thelimbostudio.com
- Email: contact@thelimbostudio.com
- Phone: (651) 551-2587
- Location: Minnetonka, MN