# Fix DMARC Failure for ProtonMail + Custom Domain

## Problem
Emails sent from `alex@thelimbostudio.com` via ProtonMail are failing DMARC authentication at recipient mail servers.

## Root Cause
Your domain sends emails from **three different systems**:
1. **ProtonMail** (alex@thelimbostudio.com) - Personal email
2. **Resend API** (noreply@thelimbostudio.com) - Chat widget automation
3. **Cloudflare Email Routing** (noreply@thelimbostudio.com) - Contact form

But your SPF record likely only authorizes Resend and/or Cloudflare, **missing ProtonMail**.

When you send from ProtonMail, the recipient's server sees:
- ❌ SPF: FAIL (ProtonMail servers not authorized)
- ❌ DMARC: FAIL (SPF failed, no aligned DKIM)
- 🚫 Result: Email marked as spam or rejected

---

## Solution Overview

You need to:
1. ✅ Add ProtonMail to SPF record
2. ✅ Configure ProtonMail DKIM keys
3. ✅ Verify DMARC policy (already set to `p=quarantine`)

---

## Step-by-Step Fix

### Step 1: Update SPF Record in Cloudflare

**CRITICAL: Add ProtonMail to your SPF**

**New SPF Record:**
```
v=spf1 include:_spf.protonmail.ch include:_spf.resend.com include:_spf.mx.cloudflare.net ~all
```

**How to Update:**

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your domain: **thelimbostudio.com**
3. Go to **DNS** → **Records**
4. Find the **TXT** record with name `@` or `thelimbostudio.com` that contains `v=spf1`
5. Click **Edit**
6. Update the content to:
   ```
   v=spf1 include:_spf.protonmail.ch include:_spf.resend.com include:_spf.mx.cloudflare.net ~all
   ```
7. Click **Save**

**Record Details:**
- **Type**: TXT
- **Name**: `@` (represents thelimbostudio.com)
- **Content**: `v=spf1 include:_spf.protonmail.ch include:_spf.resend.com include:_spf.mx.cloudflare.net ~all`
- **TTL**: Auto

**What this does:**
- `include:_spf.protonmail.ch` - Authorizes ProtonMail servers to send as @thelimbostudio.com
- `include:_spf.resend.com` - Authorizes Resend API (chat widget)
- `include:_spf.mx.cloudflare.net` - Authorizes Cloudflare Email Routing (contact form)
- `~all` - Soft fail for all other servers (recommended for testing)

---

### Step 2: Configure ProtonMail DKIM Keys

ProtonMail requires DKIM to be set up for custom domains.

**In ProtonMail:**

1. Log in to [ProtonMail](https://mail.proton.me/)
2. Go to **Settings** (gear icon)
3. Navigate to **All Settings** → **Identity and addresses** → **Domains**
4. Select your domain: **thelimbostudio.com**
5. Click on **DKIM keys** or **Authentication**
6. You should see 3 DKIM records provided by ProtonMail

**Example ProtonMail DKIM Records:**
```
Record 1:
Name: protonmail._domainkey.thelimbostudio.com
Type: TXT
Content: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBA...

Record 2:
Name: protonmail2._domainkey.thelimbostudio.com
Type: TXT
Content: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBA...

Record 3:
Name: protonmail3._domainkey.thelimbostudio.com
Type: TXT
Content: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBA...
```

**Add to Cloudflare DNS:**

For **each** of the 3 DKIM records:

1. In Cloudflare DNS, click **Add record**
2. **Type**: TXT
3. **Name**: Copy from ProtonMail (e.g., `protonmail._domainkey`)
4. **Content**: Copy the full DKIM value from ProtonMail (starts with `v=DKIM1;`)
5. **TTL**: Auto
6. Click **Save**
7. Repeat for all 3 records

**Important:**
- Copy the records **exactly** as shown in ProtonMail
- Include the full content string (can be very long)
- Don't add quotes around the content (Cloudflare adds them automatically)

---

### Step 3: Configure Resend DKIM (If Not Already Done)

1. Log in to [Resend Dashboard](https://resend.com/domains)
2. Select or add domain: **thelimbostudio.com**
3. Click **Verify Domain**
4. Copy the DKIM records provided
5. Add them to Cloudflare DNS (similar process as ProtonMail DKIM)

---

### Step 4: Verify DMARC Record

You mentioned you already have:
```
v=DMARC1; p=quarantine
```

This is good! But I recommend enhancing it to include reporting:

**Recommended DMARC Record:**
```
v=DMARC1; p=quarantine; rua=mailto:alex@thelimbostudio.com; ruf=mailto:alex@thelimbostudio.com; pct=100; adkim=r; aspf=r;
```

**How to Update:**

1. In Cloudflare DNS, find the TXT record with name `_dmarc`
2. Edit the record
3. Update content to:
   ```
   v=DMARC1; p=quarantine; rua=mailto:alex@thelimbostudio.com; ruf=mailto:alex@thelimbostudio.com; pct=100; adkim=r; aspf=r;
   ```
4. Save

**What this adds:**
- `rua=mailto:alex@thelimbostudio.com` - Daily aggregate reports sent to your email
- `ruf=mailto:alex@thelimbostudio.com` - Real-time failure reports
- `pct=100` - Apply policy to 100% of emails
- `adkim=r` - Relaxed DKIM alignment (recommended)
- `aspf=r` - Relaxed SPF alignment (recommended)

**DMARC Record Details:**
- **Type**: TXT
- **Name**: `_dmarc`
- **Content**: (see above)
- **TTL**: Auto

---

## Complete DNS Configuration

Here's what your final Cloudflare DNS should look like:

| Type | Name | Content | Priority | TTL |
|------|------|---------|----------|-----|
| **MX** | @ | mail.protonmail.ch | 10 | Auto |
| **MX** | @ | mailsec.protonmail.ch | 20 | Auto |
| **TXT** | @ | `v=spf1 include:_spf.protonmail.ch include:_spf.resend.com include:_spf.mx.cloudflare.net ~all` | - | Auto |
| **TXT** | _dmarc | `v=DMARC1; p=quarantine; rua=mailto:alex@thelimbostudio.com; ...` | - | Auto |
| **TXT** | protonmail._domainkey | `v=DKIM1; k=rsa; p=...` (from ProtonMail) | - | Auto |
| **TXT** | protonmail2._domainkey | `v=DKIM1; k=rsa; p=...` (from ProtonMail) | - | Auto |
| **TXT** | protonmail3._domainkey | `v=DKIM1; k=rsa; p=...` (from ProtonMail) | - | Auto |
| **TXT** | resend._domainkey | `v=DKIM1; k=rsa; p=...` (from Resend) | - | Auto |

---

## Verification Steps

### 1. Check SPF Record

**Using dig (Linux/Mac):**
```bash
dig +short txt thelimbostudio.com
```

**Using nslookup (Windows):**
```cmd
nslookup -type=txt thelimbostudio.com
```

**Expected output should include:**
```
"v=spf1 include:_spf.protonmail.ch include:_spf.resend.com include:_spf.mx.cloudflare.net ~all"
```

### 2. Check ProtonMail DKIM

```bash
dig +short txt protonmail._domainkey.thelimbostudio.com
dig +short txt protonmail2._domainkey.thelimbostudio.com
dig +short txt protonmail3._domainkey.thelimbostudio.com
```

Each should return a DKIM record starting with `v=DKIM1; k=rsa; p=...`

### 3. Check DMARC

```bash
dig +short txt _dmarc.thelimbostudio.com
```

Should return:
```
"v=DMARC1; p=quarantine; ..."
```

### 4. Use Online Tools

- [MXToolbox DMARC Check](https://mxtoolbox.com/dmarc.aspx) - Enter: thelimbostudio.com
- [MXToolbox SPF Check](https://mxtoolbox.com/spf.aspx) - Enter: thelimbostudio.com
- [Google Admin Toolbox](https://toolbox.googleapps.com/apps/checkmx/) - Enter: thelimbostudio.com

---

## Testing

### Send a Test Email from ProtonMail

1. Compose email in ProtonMail from alex@thelimbostudio.com
2. Send to a Gmail or Outlook account you control
3. Wait 2-5 minutes for delivery
4. Check the email headers

**In Gmail:**
1. Open the email
2. Click three dots (⋮) → **Show original**
3. Look for "Authentication-Results"

**What you should see:**
```
Authentication-Results: mx.google.com;
  spf=pass (google.com: domain of alex@thelimbostudio.com designates ... as permitted sender)
  smtp.mailfrom=alex@thelimbostudio.com;
  dkim=pass header.i=@thelimbostudio.com header.s=protonmail header.b=...;
  dmarc=pass (p=QUARANTINE sp=QUARANTINE dis=NONE) header.from=thelimbostudio.com
```

**Success indicators:**
- ✅ `spf=pass`
- ✅ `dkim=pass`
- ✅ `dmarc=pass`

---

## Troubleshooting

### SPF Still Failing

**Check:**
- DNS propagation (wait 15-30 minutes after changes)
- Verify only ONE SPF record exists (no duplicates)
- Check for typos in `include:_spf.protonmail.ch`
- Ensure ProtonMail is listed FIRST in the SPF includes

**Verify DNS:**
```bash
dig +short txt thelimbostudio.com | grep spf
```

### DKIM Failing

**Check ProtonMail DKIM Setup:**
- In ProtonMail Settings → Domains, verify status shows "Verified"
- Ensure all 3 DKIM records are added to Cloudflare
- Wait up to 48 hours for full DNS propagation
- Copy DKIM records exactly (they're very long strings)

**Common Issues:**
- Missing one of the 3 DKIM records
- Typo in the record name (should be `protonmail._domainkey`)
- Record content truncated or has spaces inserted

**Verify DKIM:**
```bash
dig +short txt protonmail._domainkey.thelimbostudio.com
```

### DMARC Still Failing

**Requirements for DMARC to pass:**
- **Either** SPF or DKIM must pass (preferably both)
- The passing mechanism must have "alignment" with the From: domain

**If SPF passes but DMARC fails:**
- Check SPF alignment (`aspf=r` for relaxed)
- Verify From: address is @thelimbostudio.com

**If DKIM passes but DMARC fails:**
- Check DKIM alignment (`adkim=r` for relaxed)
- Verify DKIM signature domain matches From: domain

### DNS Propagation

**Timeline:**
- Cloudflare DNS: Usually 2-5 minutes
- Global propagation: Up to 24-48 hours
- Email provider caches: Up to 24 hours

**Check propagation globally:**
- [WhatsMyDNS.net](https://www.whatsmydns.net/)
- Enter: thelimbostudio.com
- Type: TXT
- Check different global locations

---

## Why This Was Failing

### Before Fix:
```
From: alex@thelimbostudio.com
SPF Record: v=spf1 include:_spf.resend.com ~all
                                    ↑
                         Missing ProtonMail!

Recipient checks SPF:
- Email from ProtonMail server IP: 185.70.x.x
- SPF says: Only Resend servers allowed
- Result: SPF=FAIL → DMARC=FAIL → Spam/Reject
```

### After Fix:
```
From: alex@thelimbostudio.com
SPF Record: v=spf1 include:_spf.protonmail.ch include:_spf.resend.com ~all
                            ↑
                      Now includes ProtonMail!

Recipient checks SPF:
- Email from ProtonMail server IP: 185.70.x.x
- SPF says: ProtonMail servers are allowed
- Result: SPF=PASS
- Plus DKIM=PASS from ProtonMail signature
- Result: DMARC=PASS → Inbox
```

---

## Email Sending Sources Summary

Your domain sends emails from **three sources**:

| Source | From Address | Use Case | Authorization |
|--------|--------------|----------|---------------|
| **ProtonMail** | alex@thelimbostudio.com | Personal email | SPF: `_spf.protonmail.ch`<br>DKIM: 3 keys from ProtonMail |
| **Resend API** | noreply@thelimbostudio.com | Chat widget automation | SPF: `_spf.resend.com`<br>DKIM: From Resend dashboard |
| **Cloudflare** | noreply@thelimbostudio.com | Contact form | SPF: `_spf.mx.cloudflare.net` |

All three must be in your SPF record for DMARC to pass.

---

## Timeline & Expectations

### Immediate (5-30 minutes):
- DNS changes propagate through Cloudflare
- SPF record updates globally
- DKIM records become queryable

### Short-term (1-4 hours):
- Most email providers will see new records
- Test emails should pass DMARC

### Medium-term (24-48 hours):
- Full global DNS propagation
- All email providers updated
- Cached DNS entries expire

### DMARC Reports:
- **Aggregate (rua)**: Sent daily at ~midnight UTC
- **Forensic (ruf)**: Sent in real-time when failures occur
- You'll receive reports at alex@thelimbostudio.com

---

## ProtonMail-Specific Notes

### Custom Domain Requirements
- ✅ MX records pointing to ProtonMail (you have this)
- ✅ SPF includes ProtonMail (needs fix)
- ✅ DKIM keys from ProtonMail (needs setup)
- ✅ DMARC policy (you have this)

### ProtonMail Plus/Professional
- Custom domain requires ProtonMail Plus or higher
- If on Free plan, upgrade required for custom domain

### Verification in ProtonMail
After adding DNS records:
1. ProtonMail Settings → Domains
2. Click **Verify** or **Refresh**
3. Status should show "Verified" with green checkmark
4. May take up to 24 hours to verify

---

## Quick Action Checklist

- [ ] Update SPF to include `include:_spf.protonmail.ch`
- [ ] Get DKIM keys from ProtonMail Settings → Domains
- [ ] Add all 3 ProtonMail DKIM records to Cloudflare DNS
- [ ] Update DMARC to include reporting email addresses
- [ ] Wait 30 minutes for DNS propagation
- [ ] Send test email from alex@thelimbostudio.com to Gmail
- [ ] Check email headers for SPF/DKIM/DMARC pass
- [ ] Monitor DMARC reports for 1-2 weeks
- [ ] Verify ProtonMail domain status shows "Verified"

---

## Support Resources

- [ProtonMail Custom Domain Setup](https://proton.me/support/custom-domain)
- [ProtonMail DKIM Setup](https://proton.me/support/anti-spoofing-custom-domain)
- [Cloudflare DNS Documentation](https://developers.cloudflare.com/dns/)
- [DMARC.org Specification](https://dmarc.org/)
- [Google DMARC Guide](https://support.google.com/a/answer/2466580)

---

## Summary

**The Fix (3 steps):**

1. **Update SPF** in Cloudflare DNS:
   ```
   v=spf1 include:_spf.protonmail.ch include:_spf.resend.com include:_spf.mx.cloudflare.net ~all
   ```

2. **Add ProtonMail DKIM** (3 records) from ProtonMail Settings to Cloudflare DNS

3. **Wait 30 minutes** and test

That's it! Your emails from alex@thelimbostudio.com should now pass DMARC authentication.
