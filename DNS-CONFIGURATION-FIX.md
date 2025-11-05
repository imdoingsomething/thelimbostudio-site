# DNS Configuration Fix for DMARC Authentication

## Problem
Your emails are failing DMARC authentication because:
1. SPF record is incomplete (missing Cloudflare Email Routing)
2. DMARC policy may need strengthening
3. DKIM records may not be properly configured

## Solution: Update DNS Records in Cloudflare

### Step 1: Update SPF Record

**Current SPF:**
```
v=spf1 include:_spf.resend.com ~all
```

**New SPF (Fixed):**
```
v=spf1 include:_spf.resend.com include:_spf.mx.cloudflare.net ~all
```

**How to update:**
1. Log in to Cloudflare Dashboard
2. Go to **DNS** > **Records**
3. Find the TXT record with your current SPF
4. Edit it to include both `_spf.resend.com` and `_spf.mx.cloudflare.net`
5. Click **Save**

**Record Details:**
- Type: `TXT`
- Name: `@` (or `thelimbostudio.com`)
- Content: `v=spf1 include:_spf.resend.com include:_spf.mx.cloudflare.net ~all`
- TTL: `Auto` or `3600`

---

### Step 2: Configure DKIM Records (Resend)

**Action Required:**
1. Log in to [Resend Dashboard](https://resend.com/domains)
2. Navigate to **Domains** section
3. Select/verify domain: `thelimbostudio.com`
4. Copy the DKIM records provided by Resend (usually 3 records)

**Example DKIM Record Format:**
```
Name: resend._domainkey.thelimbostudio.com
Type: TXT
Content: v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GN...
```

**Add to Cloudflare:**
1. In Cloudflare DNS, click **Add record**
2. Type: `TXT`
3. Name: `resend._domainkey` (or as specified by Resend)
4. Content: (paste the full DKIM value from Resend)
5. TTL: `Auto`
6. Click **Save**
7. Repeat for all DKIM records provided by Resend

---

### Step 3: Update DMARC Record

**Current DMARC:**
```
v=DMARC1; p=none;
```

**New DMARC (Recommended):**
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@thelimbostudio.com; ruf=mailto:dmarc@thelimbostudio.com; pct=100; adkim=r; aspf=r;
```

**Alternative (Start with monitoring):**
```
v=DMARC1; p=none; rua=mailto:dmarc@thelimbostudio.com; ruf=mailto:dmarc@thelimbostudio.com; pct=100; adkim=r; aspf=r;
```

**How to update:**
1. In Cloudflare DNS, find the TXT record with name `_dmarc`
2. Edit the record
3. Update content to new DMARC policy
4. Click **Save**

**Record Details:**
- Type: `TXT`
- Name: `_dmarc` (or `_dmarc.thelimbostudio.com`)
- Content: (see above)
- TTL: `Auto` or `3600`

**DMARC Policy Explanation:**
- `p=none` - Monitor only (recommended for testing)
- `p=quarantine` - Mark suspicious emails as spam (recommended after testing)
- `p=reject` - Reject failed emails (strictest, use after monitoring)
- `rua` - Aggregate reports email address
- `ruf` - Forensic (failure) reports email address
- `pct=100` - Apply policy to 100% of emails
- `adkim=r` - Relaxed DKIM alignment
- `aspf=r` - Relaxed SPF alignment

**Recommended Rollout:**
1. Start with `p=none` for 1-2 weeks to monitor
2. Review DMARC reports sent to dmarc@thelimbostudio.com
3. Once confirmed working, change to `p=quarantine`
4. After another 1-2 weeks, optionally change to `p=reject`

---

### Step 4: Set Up DMARC Report Receiving

You need to set up `dmarc@thelimbostudio.com` to receive reports:

**Option 1: Forward to existing email**
1. In Cloudflare DNS, use Email Routing
2. Create forwarding rule: `dmarc@thelimbostudio.com` → `contact@thelimbostudio.com`

**Option 2: Use DMARC reporting service**
- [Postmark DMARC Digests](https://dmarc.postmarkapp.com/) (Free)
- [DMARC Analyzer](https://www.dmarcanalyzer.com/) (Free tier available)
- [dmarcian](https://dmarcian.com/) (Paid)

---

## Complete DNS Configuration Summary

Here's what your final Cloudflare DNS should look like:

| Type | Name | Content | Priority | TTL |
|------|------|---------|----------|-----|
| MX | @ | mail.protonmail.ch | 10 | Auto |
| MX | @ | mailsec.protonmail.ch | 20 | Auto |
| TXT | @ | `v=spf1 include:_spf.resend.com include:_spf.mx.cloudflare.net ~all` | - | Auto |
| TXT | _dmarc | `v=DMARC1; p=none; rua=mailto:dmarc@thelimbostudio.com; ...` | - | Auto |
| TXT | resend._domainkey | `v=DKIM1; k=rsa; p=...` (from Resend) | - | Auto |

---

## Verification Steps

### 1. Check SPF Record
```bash
# Using dig (Linux/Mac)
dig +short txt thelimbostudio.com

# Using nslookup (Windows)
nslookup -type=txt thelimbostudio.com
```

**Expected output should include:**
```
"v=spf1 include:_spf.resend.com include:_spf.mx.cloudflare.net ~all"
```

### 2. Check DKIM Record
```bash
dig +short txt resend._domainkey.thelimbostudio.com
```

**Expected output should include:**
```
"v=DKIM1; k=rsa; p=..."
```

### 3. Check DMARC Record
```bash
dig +short txt _dmarc.thelimbostudio.com
```

**Expected output should include:**
```
"v=DMARC1; p=none; ..."
```

### 4. Use Online Tools
- [MXToolbox DMARC Check](https://mxtoolbox.com/dmarc.aspx)
- [MXToolbox SPF Check](https://mxtoolbox.com/spf.aspx)
- [DKIM Validator](https://www.appmaildev.com/en/dkim)
- [Google Admin Toolbox](https://toolbox.googleapps.com/apps/checkmx/)

---

## Testing Email Authentication

### Send Test Emails

1. **Test via Chat Widget:**
   - Go to https://thelimbostudio.com
   - Use the AI chat widget
   - Request a transcript
   - Check email headers for DMARC pass

2. **Test via Contact Form:**
   - Go to https://thelimbostudio.com/contact.html
   - Submit a message
   - Check email headers for DMARC pass

### Check Email Headers

When you receive the test email, view the full headers:

**Gmail:**
1. Open the email
2. Click three dots (⋮)
3. Select "Show original"
4. Look for:
   ```
   SPF: PASS
   DKIM: PASS
   DMARC: PASS
   ```

**ProtonMail:**
1. Open the email
2. Click "View headers"
3. Look for authentication results

**What to look for:**
```
Authentication-Results:
  spf=pass smtp.mailfrom=thelimbostudio.com;
  dkim=pass header.d=thelimbostudio.com;
  dmarc=pass (policy=none) header.from=thelimbostudio.com
```

---

## Troubleshooting

### If SPF Still Fails
- Wait 5-30 minutes for DNS propagation
- Use `dig` to verify record is updated
- Check for typos in the SPF record
- Ensure only ONE SPF record exists (no duplicates)

### If DKIM Fails
- Verify domain in Resend dashboard
- Check DKIM records are correctly copied from Resend
- Wait up to 48 hours for full DNS propagation
- Ensure DKIM record name matches Resend specifications

### If DMARC Fails
- Ensure both SPF and DKIM are configured
- Check DMARC record syntax (no spaces after semicolons)
- Verify `From:` domain matches `thelimbostudio.com`
- Use relaxed alignment (`adkim=r; aspf=r;`)

### If Using Subdomains
If sending from subdomain (e.g., `noreply@mail.thelimbostudio.com`):
- Add SPF record to subdomain
- Add DKIM for subdomain in Resend
- Use `sp=none` in parent domain DMARC for subdomain policy

---

## Timeline

- **DNS propagation**: 5 minutes to 48 hours (typically 15-30 minutes)
- **Email provider cache**: Some email providers cache DNS for 24 hours
- **DMARC reports**: Daily (aggregate) and real-time (forensic)

---

## Support Resources

- [Resend Documentation](https://resend.com/docs)
- [Cloudflare Email Routing Docs](https://developers.cloudflare.com/email-routing/)
- [DMARC.org](https://dmarc.org/)
- [Google DMARC Guide](https://support.google.com/a/answer/2466580)

---

## Quick Checklist

- [ ] Update SPF record to include both Resend and Cloudflare
- [ ] Verify domain in Resend dashboard
- [ ] Add DKIM records from Resend to Cloudflare DNS
- [ ] Update DMARC record with reporting addresses
- [ ] Set up dmarc@thelimbostudio.com email forwarding
- [ ] Wait 30 minutes for DNS propagation
- [ ] Test with chat widget email
- [ ] Test with contact form email
- [ ] Check email headers for DMARC pass
- [ ] Monitor DMARC reports for 1-2 weeks
- [ ] Gradually strengthen DMARC policy (none → quarantine → reject)

---

## Notes

- Both email systems (Resend + Cloudflare) use the same From address: `noreply@thelimbostudio.com`
- Both send to: `contact@thelimbostudio.com`
- Chat widget (workers/chat.js) uses Resend API
- Contact form (workers/contact-worker.js) uses Cloudflare Email Routing
- This is why both must be included in SPF record
