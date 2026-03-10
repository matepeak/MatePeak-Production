# Test Time Request Email System

## How to Test

### 1. **Check Browser Console Logs**

When a mentor approves/declines a time request, check the browser console (F12) for these logs:

```
📧 Attempting to send email notification...
Student email: [email]
Student name: [name]
Mentor name: [name]
🔍 Email function called with:
- Student Email: [email]
- Student Name: [name]
- Mentor Name: [name]
- Status: approved/declined
📤 Invoking send-email function...
Subject: [subject line]
To: [email]
✅ Email function response: [response data]
✅ Time request response email sent successfully to [email]
```

### 2. **Common Issues & Solutions**

#### Issue: "Student email not found"

**Solution:** The student's email might not be loaded. Check:

```sql
-- Run this in Supabase SQL Editor
SELECT
  br.id,
  br.mentee_id,
  p.email,
  p.full_name
FROM booking_requests br
LEFT JOIN profiles p ON p.id = br.mentee_id
WHERE br.mentor_id = 'YOUR_MENTOR_ID'
ORDER BY br.created_at DESC;
```

#### Issue: Edge Function not deployed

**Solution:** Deploy the send-email function:

```bash
# In PowerShell terminal
cd "D:\Matepeak\Project\spark-mentor-connect-08475-37914-35681--84739"
supabase functions deploy send-email
```

#### Issue: RESEND_API_KEY not configured

**Solution:** Set the environment variable in Supabase:

1. Go to Supabase Dashboard
2. Project Settings → Edge Functions
3. Add secret: `RESEND_API_KEY` = `your_resend_api_key`

### 3. **Test Email Manually**

Open browser console on your app and run:

```javascript
// Replace with actual values
const testEmail = {
  to: "student@example.com",
  subject: "Test Time Request Email",
  html: "<h1>Test Email</h1><p>If you receive this, email system is working!</p>",
};

// Test sending
const { data, error } = await supabase.functions.invoke("send-email", {
  body: testEmail,
});

console.log("Result:", { data, error });
```

### 4. **Verify Resend Dashboard**

1. Go to https://resend.com/dashboard
2. Check "Emails" section
3. Look for emails sent to the student's address
4. Check delivery status

### 5. **Check Supabase Edge Function Logs**

1. Go to Supabase Dashboard
2. Edge Functions → send-email
3. Click "Logs" tab
4. Look for invocation logs when you approve/decline

## Expected Email Content

### For Approved Request:

- **Subject:** ✅ Time Request Approved by [Mentor Name]
- **Content:** Green themed, congratulatory message
- **CTA:** "View Dashboard" button

### For Declined Request:

- **Subject:** 📅 Time Request Update from [Mentor Name]
- **Content:** Blue themed, encouraging message
- **CTA:** "Explore Other Times" button

## Troubleshooting Checklist

- [ ] Student email exists in profiles table
- [ ] send-email Edge Function is deployed
- [ ] RESEND_API_KEY is set in Supabase secrets
- [ ] Check browser console for logs
- [ ] Check Supabase Edge Function logs
- [ ] Check Resend dashboard for email status
- [ ] Verify student email is valid

## Quick Deploy Commands

```powershell
# Deploy all Edge Functions
cd "D:\Matepeak\Project\spark-mentor-connect-08475-37914-35681--84739"
supabase functions deploy

# Deploy only send-email
supabase functions deploy send-email

# View logs
supabase functions logs send-email
```
