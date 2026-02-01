# Free Contact Form Alternatives to WPForms Pro

## Best Free Options (No Limitations)

---

## Option 1: Contact Form 7 (Most Popular - Completely Free)

### Why Choose Contact Form 7?
✅ **100% Free Forever**
✅ Over 5 million active installations
✅ No entry limits or restrictions
✅ Simple and lightweight
✅ Supports multiple forms
✅ AJAX submissions
✅ Easy spam protection with free plugins

### Installation Steps

1. **Install Plugin**
   - WordPress Admin → Plugins → Add New
   - Search: "Contact Form 7"
   - Install and Activate

2. **Create Form**
   - Left sidebar → Contact → Add New
   - Default form is already created for you!
   - Name it: "MistressStyle Contact Form"

3. **Default Form Includes:**
   ```
   Your Name (required)
   Your Email (required)
   Subject
   Your Message
   ```

4. **Customize Form Fields (Optional)**
   ```
   <label> Your Name (required)
   [text* your-name] </label>

   <label> Your Email (required)
   [email* your-email] </label>

   <label> What can I help you with?
   [select your-topic "General Inquiry" "Collaboration Request" "Press/Media" "Style Question" "Other"] </label>

   <label> Your Message
   [textarea your-message] </label>

   [submit "Send Message"]
   ```

5. **Configure Email (Mail Tab)**
   - To: your-email@example.com
   - From: wordpress@mistressstyle.com
   - Subject: "Contact Form from MistressStyle"
   - Message body: Already configured (uses form fields)

6. **Copy Shortcode**
   - You'll see: `[contact-form-7 id="123" title="Contact form"]`
   - Copy this

7. **Add to Contact Page**
   - Pages → Add New or Edit existing
   - Title: "Contact"
   - Add shortcode block and paste your shortcode
   - Publish

### Where Do Submissions Go?

**Important:** Contact Form 7 sends emails but doesn't store entries by default.

**Solution: Install Flamingo (Free Plugin)**
- Made by same developer as Contact Form 7
- Stores all submissions in WordPress dashboard
- Go to Plugins → Add New
- Search: "Flamingo"
- Install and Activate
- Now all submissions saved to: Flamingo → Inbound Messages

---

## Option 2: Fluent Forms (Free Version - Best Features)

### Why Choose Fluent Forms?
✅ Free version is very powerful
✅ Beautiful, modern forms
✅ Drag and drop builder
✅ Stores entries in WordPress (no upgrade needed!)
✅ Conditional logic
✅ Multi-column layouts
✅ Email notifications included

### Installation Steps

1. **Install Plugin**
   - Plugins → Add New
   - Search: "Fluent Forms"
   - Install "Contact Form Plugin by Fluent Forms"
   - Activate

2. **Create Form**
   - Left sidebar → Fluent Forms → Add New
   - Choose template: "Contact Form" (or blank)
   - Name: "MistressStyle Contact Form"

3. **Drag & Drop Fields**
   - Name (Simple Text)
   - Email
   - Dropdown (for topic selection)
   - Text Area (for message)
   - Submit Button

4. **Configure Settings**
   - Settings & Integrations tab
   - Email Notifications: Add your email
   - Confirmation: Customize success message

5. **Add to Page**
   - Get shortcode from Fluent Forms list
   - Or use Fluent Forms block in Gutenberg
   - Add to Contact page

### View Entries
- Fluent Forms → Entries
- All submissions stored here FREE
- Export to CSV anytime

---

## Option 3: Forminator (Free by WPMU DEV)

### Why Choose Forminator?
✅ Completely free
✅ Unlimited forms and entries
✅ Beautiful pre-built templates
✅ Visual builder
✅ Stores all entries
✅ Email notifications
✅ Anti-spam protection included

### Installation Steps

1. **Install**
   - Plugins → Add New
   - Search: "Forminator"
   - Install and Activate

2. **Create Form**
   - Forminator → Create
   - Choose: "Contact Us" template
   - Customize fields as needed

3. **Email Setup**
   - Settings → Notifications
   - Add your email address
   - Customize email template

4. **Add to Page**
   - Get shortcode or use Forminator block
   - Add to Contact page

### View Submissions
- Forminator → Submissions
- All entries stored forever
- Export functionality included

---

## Recommended Setup: Contact Form 7 + Flamingo

This is the most popular free solution used by millions:

### Step-by-Step Complete Setup

#### 1. Install Both Plugins

```
Plugin 1: Contact Form 7
Plugin 2: Flamingo
```

#### 2. Create Contact Form

**Go to:** Contact → Contact Forms → Add New

**Form Name:** MistressStyle Contact Form

**Form Template (copy this):**
```html
<label> Your Name (required)
    [text* your-name autocomplete:name] 
</label>

<label> Your Email (required)
    [email* your-email autocomplete:email] 
</label>

<label> What can I help you with?
    [select your-topic "General Inquiry" "Collaboration Request" "Press/Media" "Advertising" "Style Question" "Other"] 
</label>

<label> Your Message
    [textarea your-message] 
</label>

[submit "Send Message"]
```

#### 3. Configure Email (Mail Tab)

```
To: your-email@example.com
From: [your-email]
From Name: [your-name]
Subject: New message from MistressStyle.com
Reply-To: [your-email]

Message Body:
From: [your-name] <[your-email]>
Topic: [your-topic]

Message:
[your-message]

---
Sent from mistressstyle.com/contact
```

#### 4. Messages Tab (Customize)

**Success message:**
```
Thank you for your message! I'll respond within 24-48 hours.
```

**Error messages:** (Leave default or customize)

#### 5. Additional Settings (Optional)

**Add this for spam protection:**
```
acceptance_as_validation: on
```

#### 6. Save and Get Shortcode

Click "Save" and copy the shortcode shown at top:
```
[contact-form-7 id="123" title="MistressStyle Contact Form"]
```

#### 7. Create Contact Page

1. Pages → Add New
2. Title: "Contact"
3. Add intro text:
   ```
   I'd love to hear from you! Whether you have a style question, 
   collaboration idea, or just want to say hello, send me a message below.
   ```

4. Add Shortcode block
5. Paste your Contact Form 7 shortcode
6. Publish

#### 8. View Submissions

**Go to:** Flamingo → Inbound Messages

All form submissions will appear here with:
- Date/time
- Name
- Email
- Topic
- Message
- Status (read/unread)

You can:
- Mark as spam
- Export all entries
- Delete entries
- Search entries

---

## Spam Protection (Free Options)

### Method 1: Google reCAPTCHA (Best)

1. **Get reCAPTCHA Keys**
   - Go to: https://www.google.com/recaptcha/admin
   - Register your site
   - Choose: reCAPTCHA v3 (invisible)
   - Get Site Key and Secret Key

2. **Add to Contact Form 7**
   - Contact → Integration
   - Click "Setup Integration" under reCAPTCHA
   - Paste your keys
   - Save

3. **Form automatically protected!**

### Method 2: Akismet (Free for Personal Sites)

1. Install Akismet plugin (usually pre-installed)
2. Get free API key from wordpress.com
3. Activate
4. Contact Form 7 automatically uses it

### Method 3: Honeypot (Simplest)

Add to your form:
```
[honeypot your-honeypot]
```

Invisible to users, catches bots.

---

## Styling Your Contact Form

### For Contact Form 7

Add to Appearance → Customize → Additional CSS:

```css
/* Contact Form 7 Styling */
.wpcf7-form {
    max-width: 600px;
    margin: 0 auto;
}

.wpcf7-form label {
    display: block;
    margin-bottom: 20px;
    font-weight: 600;
    color: #333;
}

.wpcf7-form input[type="text"],
.wpcf7-form input[type="email"],
.wpcf7-form textarea,
.wpcf7-form select {
    width: 100%;
    padding: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 5px;
    font-size: 16px;
    margin-top: 5px;
}

.wpcf7-form input:focus,
.wpcf7-form textarea:focus,
.wpcf7-form select:focus {
    border-color: #000;
    outline: none;
}

.wpcf7-form textarea {
    min-height: 150px;
    resize: vertical;
}

.wpcf7-form .wpcf7-submit {
    background-color: #000;
    color: #fff;
    padding: 15px 40px;
    border: none;
    border-radius: 5px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.3s;
}

.wpcf7-form .wpcf7-submit:hover {
    background-color: #333;
}

/* Success message */
.wpcf7-response-output {
    border: 2px solid #4CAF50 !important;
    background-color: #f0f9f0;
    padding: 15px;
    margin-top: 20px;
    border-radius: 5px;
}

/* Error message */
.wpcf7-validation-errors {
    border: 2px solid #f44336 !important;
    background-color: #fff0f0;
}

/* Individual field errors */
.wpcf7-not-valid {
    border-color: #f44336 !important;
}

.wpcf7-not-valid-tip {
    color: #f44336;
    font-size: 14px;
    margin-top: 5px;
}
```

---

## Email Not Arriving? Fix It!

### Problem: Forms submit but you don't receive emails

### Solution: Install WP Mail SMTP (Free)

1. **Install Plugin**
   - Plugins → Add New
   - Search: "WP Mail SMTP"
   - Install and Activate

2. **Choose Mailer**
   - WP Mail SMTP → Settings
   - Choose: "Other SMTP" (or Gmail for testing)

3. **For Gmail (Free for testing):**
   ```
   SMTP Host: smtp.gmail.com
   SMTP Port: 587
   Encryption: TLS
   SMTP Username: your.gmail@gmail.com
   SMTP Password: [App Password - not regular password]
   ```

4. **Get Gmail App Password:**
   - Gmail → Settings → Security
   - 2-Step Verification (must be on)
   - App passwords → Generate
   - Use this password in WP Mail SMTP

5. **Test Email**
   - WP Mail SMTP → Email Test
   - Send test email
   - Check if received

### Alternative: Use Your Host's SMTP

Ask your hosting provider for SMTP settings.

---

## Comparison Chart

| Feature | Contact Form 7 + Flamingo | Fluent Forms Free | Forminator Free | WPForms Lite |
|---------|---------------------------|-------------------|-----------------|--------------|
| **Price** | Free | Free | Free | Free |
| **Store Entries** | ✅ Yes (Flamingo) | ✅ Yes | ✅ Yes | ❌ Pro only |
| **Email Notifications** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Spam Protection** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Drag & Drop** | ❌ No | ✅ Yes | ✅ Yes | ✅ Yes (limited) |
| **Export Entries** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ Pro only |
| **Ease of Use** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| **Customization** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |

---

## My Recommendation

### For You (MistressStyle.com): Contact Form 7 + Flamingo

**Why?**
✅ Completely free forever
✅ Most popular and reliable
✅ Stores all entries with Flamingo
✅ Easy email notifications
✅ Excellent spam protection
✅ Highly customizable
✅ Works perfectly for your needs

**Setup Time:** 10 minutes

**Cost:** $0

---

## Quick Start Guide: Contact Form 7 + Flamingo

### 5-Minute Setup

1. **Install two plugins:** Contact Form 7 + Flamingo (2 mins)

2. **Use the default form or customize** (2 mins)

3. **Copy shortcode, add to Contact page** (2 mins)

4. **Test form** (1 min)

5. **View entries in Flamingo → Inbound Messages**

**Done!** 🎉

---

## Testing Checklist

After setup:

- [ ] Submit test form
- [ ] Receive email notification
- [ ] See entry in Flamingo → Inbound Messages
- [ ] Test spam protection
- [ ] Check mobile responsiveness
- [ ] Verify confirmation message shows
- [ ] Test form with errors (empty fields)

---

## Troubleshooting

### Not receiving emails?
→ Install WP Mail SMTP

### Submissions not in Flamingo?
→ Make sure Flamingo is activated

### Form looks unstyled?
→ Add custom CSS (provided above)

### Getting spam?
→ Add reCAPTCHA or honeypot

### Form won't submit?
→ Check browser console for JavaScript errors
→ Temporarily disable other plugins to test

---

## Advanced: Custom Form Fields

### Add Website URL field:
```
<label> Your Website (optional)
    [url your-website] 
</label>
```

### Add Phone Number:
```
<label> Phone Number
    [tel your-phone] 
</label>
```

### Add Checkbox Agreement:
```
[acceptance acceptance-123] I agree to the privacy policy
```

### Add File Upload (Pro only for WPForms, but FREE for Contact Form 7!):
```
<label> Attach File (optional)
    [file your-file limit:2mb filetypes:jpg|png|pdf]
</label>
```

---

## Next Steps

1. **Uninstall WPForms** (if you want)
   - Plugins → Installed Plugins
   - Find WPForms
   - Deactivate → Delete

2. **Install Contact Form 7 + Flamingo**
   - Follow quick start guide above

3. **Create your form** (use template provided)

4. **Add to Contact page**

5. **Test everything**

6. **Start receiving messages!**

---

**You now have a completely free contact form solution that stores all entries and sends email notifications!** 

No upgrade required. No limitations. Forever free. 🎉