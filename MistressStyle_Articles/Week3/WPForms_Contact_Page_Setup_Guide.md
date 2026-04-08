# WPForms Contact Page Setup Guide for MistressStyle.com

## Complete Step-by-Step Instructions

---

## Part 1: Install & Activate WPForms

### Step 1: Install WPForms Plugin

1. **Log into WordPress Admin**
   - Go to: http://13.43.151.162/wp-admin
   - (Or https://mistressstyle.com/wp-admin once DNS works)

2. **Navigate to Plugins**
   - Left sidebar → Plugins → Add New

3. **Search for WPForms**
   - Search box: Type "WPForms"
   - Find: "Contact Form by WPForms"
   - Click: "Install Now"

4. **Activate the Plugin**
   - Click: "Activate"
   - You'll see the WPForms welcome screen

---

## Part 2: Create Your Contact Form

### Step 2: Start New Form

1. **Go to WPForms**
   - Left sidebar → WPForms → Add New

2. **Choose Template**
   - Click: "Simple Contact Form" template
   - Or click: "Blank Form" to start from scratch

3. **Name Your Form**
   - Form Name: "MistressStyle Contact Form"
   - Click: "Use Template"

---

## Part 3: Customize Your Contact Form

### Step 3: Add/Edit Form Fields

**Default fields in Simple Contact Form:**
- Name (required)
- Email (required)
- Comment or Message (required)

**Recommended fields for MistressStyle.com:**

#### Keep These:
✅ Name
✅ Email  
✅ Message

#### Add These (Optional but Recommended):

**1. Subject/Topic Dropdown**
- Click: "+ Add Fields" (left panel)
- Drag: "Dropdown" to form
- Click on the dropdown to edit:
  - Label: "What can I help you with?"
  - Choices (one per line):
    ```
    General Inquiry
    Collaboration Request
    Press/Media
    Advertising Opportunity
    Style Question
    Technical Issue
    Other
    ```
  - ✓ Required

**2. How Did You Hear About Us? (Optional)**
- Drag: "Dropdown" to form
- Label: "How did you hear about MistressStyle?"
- Choices:
  ```
  Google Search
  Pinterest
  Instagram
  Friend Recommendation
  Other Blog/Website
  Other
  ```
  - Leave unchecked (not required)

---

## Part 4: Configure Form Settings

### Step 4: General Settings

1. **Click "Settings" tab** (top of form builder)

2. **Form Name**
   - Already set: "MistressStyle Contact Form"

3. **Form Description** (optional)
   - Add if you want text above form
   - Example: "Have a question? I'd love to hear from you!"

4. **Submit Button Text**
   - Change from "Submit" to something friendly:
   - Options: "Send Message" or "Get in Touch" or "Contact Me"

---

### Step 5: Notification Settings

**These are emails YOU receive when someone submits the form**

1. **Click "Notifications" tab**

2. **Send To Email Address**
   - Change to YOUR email
   - Example: you@mistressstyle.com or your personal email

3. **Email Subject Line**
   - Change to: "New Contact Form Submission from MistressStyle.com"
   - Or: "{field_id="1"} sent a message from MistressStyle" (uses their name)

4. **From Name**
   - Set to: {field_id="1"} (uses submitter's name)
   - Or: "MistressStyle Contact Form"

5. **From Email**
   - Set to: {field_id="2"} (uses submitter's email)
   - Or your site email: noreply@mistressstyle.com

6. **Reply-To Email**
   - Set to: {field_id="2"} (so you can reply directly to them)

7. **Email Message**
   - Customize what you receive:
   ```
   New message from MistressStyle.com contact form:
   
   Name: {field_id="1"}
   Email: {field_id="2"}
   Topic: {field_id="4"}
   
   Message:
   {field_id="3"}
   
   ---
   Sent from: mistressstyle.com/contact
   ```

---

### Step 6: Confirmation Settings

**This is what the visitor sees after submitting**

1. **Click "Confirmations" tab**

2. **Confirmation Type**
   - Choose: "Message" (default and best option)

3. **Confirmation Message**
   - Customize to match your brand:
   ```
   Thank you for reaching out! 
   
   I've received your message and will get back to you within 24-48 hours. 
   
   In the meantime, check out my latest posts or follow me on Pinterest!
   
   - MistressStyle
   ```

4. **Alternative: Redirect to Thank You Page**
   - If you create a dedicated thank you page:
   - Confirmation Type: "Show Page"
   - Select your thank you page
   - (More professional, but requires creating the page)

---

### Step 7: Anti-Spam Settings

1. **Stay in Settings**
2. **Scroll to "Anti-spam"**
3. **Enable Google reCAPTCHA** (recommended)
   - Type: reCAPTCHA v2 or v3
   - Or use WPForms' built-in honeypot (easier, no setup)

**For WPForms Honeypot (easiest):**
- Just check "Enable Anti-spam honeypot"
- No configuration needed
- Invisible to users

---

## Part 5: Create Contact Page

### Step 8: Create New Page

1. **Go to Pages**
   - Left sidebar → Pages → Add New

2. **Page Title**
   - Title: "Contact"

3. **Add Content Block**
   - Click "+" to add block
   - Search: "WPForms"
   - Click the WPForms block

4. **Select Your Form**
   - Dropdown: Choose "MistressStyle Contact Form"
   - Your form will appear!

5. **Add Intro Text (Optional but Recommended)**
   - Above the form, add a paragraph:
   ```
   I'd love to hear from you! Whether you have a style question, 
   collaboration idea, or just want to say hello, drop me a message below.
   
   I typically respond within 24-48 hours.
   ```

6. **Add Additional Info (Optional)**
   - After the form, you can add:
   ```
   You can also:
   • Follow me on Pinterest: [link]
   • Follow me on Instagram: [link]  
   • Subscribe to my newsletter: [link]
   
   For press inquiries: press@mistressstyle.com
   For partnerships: partnerships@mistressstyle.com
   ```

---

### Step 9: Publish Contact Page

1. **Right sidebar → Page Settings**
   - Featured Image: Add a nice header image (optional)
   - Template: Default or Full Width (your choice)

2. **Click "Publish"**

3. **Note the URL**
   - Will be: mistressstyle.com/contact

---

## Part 6: Add Contact to Menu

### Step 10: Add to Navigation

1. **Go to Appearance → Menus**

2. **Select Your Main Menu**
   - Usually called "Primary Menu" or "Main Menu"

3. **Add Contact Page**
   - Left panel → Pages
   - Check: "Contact"
   - Click: "Add to Menu"

4. **Position the Menu Item**
   - Drag "Contact" to desired position
   - Recommended: Last item in menu
   - Order example:
     ```
     Home
     Blog
     Style Guides
     About
     Contact ← Add here
     ```

5. **Save Menu**
   - Click: "Save Menu"

---

## Part 7: Test Your Form

### Step 11: Test Submission

1. **View Your Contact Page**
   - Go to: mistressstyle.com/contact

2. **Fill Out Test Form**
   - Use real information
   - Submit

3. **Verify Everything Works**
   - ✓ See confirmation message
   - ✓ Receive email notification
   - ✓ Check spam folder if no email

4. **Check Form Entry**
   - WordPress Admin → WPForms → Entries
   - See your test submission
   - You can export, print, or delete entries here

---

## Recommended Contact Page Layouts

### Layout Option 1: Simple & Clean
```
[Header Image - Optional]

Contact Me

I'd love to hear from you! Whether you have a style 
question or collaboration idea, send me a message.

[CONTACT FORM]

Connect with me:
Pinterest | Instagram | Newsletter
```

### Layout Option 2: Professional
```
[Header]

Let's Connect!

Have a question about styling, sustainable fashion, or 
want to collaborate? I'm here to help!

I respond to all messages within 24-48 hours.

[CONTACT FORM]

Other Ways to Reach Me:

📧 Email: hello@mistressstyle.com
📱 Instagram: @mistressstyle
📌 Pinterest: /mistressstyle

Media Inquiries: press@mistressstyle.com
Brand Partnerships: partnerships@mistressstyle.com
```

### Layout Option 3: With FAQ
```
[Header]

Contact

[CONTACT FORM]

Frequently Asked Questions:

Q: How quickly will you respond?
A: Within 24-48 hours on business days.

Q: Do you offer personal styling services?
A: Currently, I focus on blog content and digital guides.

Q: Can I use your images on my site?
A: Please email for permission and licensing.

Q: Do you accept guest posts?
A: I'm selective, but open to pitches. Use the form above.
```

---

## Advanced Customization (Optional)

### Custom Styling

Add to your theme's Custom CSS (Appearance → Customize → Additional CSS):

```css
/* Contact Form Styling */
.wpforms-container {
    max-width: 600px;
    margin: 0 auto;
}

.wpforms-field-label {
    font-weight: 600;
    color: #333;
}

.wpforms-field input,
.wpforms-field textarea,
.wpforms-field select {
    border: 2px solid #e0e0e0;
    border-radius: 5px;
    padding: 12px;
    font-size: 16px;
}

.wpforms-field input:focus,
.wpforms-field textarea:focus,
.wpforms-field select:focus {
    border-color: #000;
    outline: none;
}

.wpforms-submit-container button {
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

.wpforms-submit-container button:hover {
    background-color: #333;
}

.wpforms-confirmation-container-full {
    background-color: #f0f0f0;
    padding: 20px;
    border-radius: 5px;
    border-left: 4px solid #000;
}
```

---

## Email Setup Tips

### Use Professional Email

Instead of Gmail/Yahoo, set up professional email:

**Option 1: Use AWS SES (Free tier)**
**Option 2: Use SendGrid (Free tier)**  
**Option 3: Use domain email from registrar**

**Why?** 
- Gmail may mark form emails as spam
- Professional emails have better delivery rates

### Configure WordPress to Send Email Properly

Install plugin: "WP Mail SMTP"
- Helps ensure form emails actually arrive
- Prevents emails going to spam

---

## Maintenance Checklist

### Daily:
- Check for new form submissions (WPForms → Entries)

### Weekly:
- Respond to all messages
- Check email notification is working
- Test form occasionally

### Monthly:
- Review and delete old test submissions
- Export entries for backup
- Check for spam submissions

---

## Troubleshooting

### Problem: Not receiving email notifications

**Solutions:**
1. Check spam folder
2. Verify email address in Notifications settings
3. Install "WP Mail SMTP" plugin
4. Test with different email address

### Problem: Form not displaying

**Solutions:**
1. Verify WPForms plugin is active
2. Check you selected correct form in page
3. Try adding form shortcode manually:
   ```
   [wpforms id="123" title="false"]
   ```
   (Replace 123 with your form ID)

### Problem: Spam submissions

**Solutions:**
1. Enable reCAPTCHA
2. Enable honeypot
3. Add custom question field that bots can't answer
4. Install Akismet plugin

### Problem: Form looks broken/unstyled

**Solutions:**
1. Try different page template (Full Width)
2. Check theme compatibility
3. Add custom CSS (see above)
4. Contact theme support

---

## Integration Ideas

### Email Marketing
After form submission, manually add to email list:
- Mailchimp
- ConvertKit
- MailerLite

### Customer Relationship Management
Export entries to:
- Google Sheets (via Zapier)
- Notion
- Airtable

---

## Privacy & GDPR Compliance

### Add Privacy Checkbox (Recommended)

1. Edit your form
2. Add field: "Checkbox"
3. Label: "I agree to the Privacy Policy"
4. Link to your privacy policy page
5. Make required

**Example text:**
```
☐ I agree to MistressStyle's Privacy Policy and 
   consent to having my information stored.
```

### Add to Privacy Policy

Include in your Privacy Policy page:
```
Contact Form Information:
When you submit our contact form, we collect your name, 
email address, and message content. This information is 
used solely to respond to your inquiry and is not shared 
with third parties. We retain this information for 2 years 
or until you request deletion.
```

---

## Quick Reference

### Form Shortcode
```
[wpforms id="YOUR_FORM_ID"]
```

### Common Field IDs
- Name: field_id="1"
- Email: field_id="2"  
- Message: field_id="3"
- Custom fields: field_id="4", "5", etc.

### Important URLs
- Form Builder: /wp-admin/admin.php?page=wpforms-builder
- Entries: /wp-admin/admin.php?page=wpforms-entries
- Settings: /wp-admin/admin.php?page=wpforms-settings

---

## Next Steps After Setup

1. ✅ Test form thoroughly
2. ✅ Add to main navigation menu
3. ✅ Link from footer
4. ✅ Mention in "About" page
5. ✅ Add to sidebar widget (optional)
6. ✅ Include in welcome email to subscribers
7. ✅ Monitor submissions daily

---

**Your contact form is now ready! This gives readers an easy way to reach you for collaborations, questions, and partnership opportunities.** 🎉