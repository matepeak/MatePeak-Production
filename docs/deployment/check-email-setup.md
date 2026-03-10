# Email System Diagnostic

## Current Error Analysis

Your logs show:

```
Failed to load resource: the server responded with a status of 500 ()
[Email] Supabase function error: FunctionsHttpError: Edge Function returned a non-2xx status code
```

This means the `send-email` Edge Function is **deployed** but **failing when it runs**.

## Most Likely Issue: Missing RESEND_API_KEY

### Check if RESEND_API_KEY is set:

1. Go to **Supabase Dashboard**: https://supabase.com/dashboard/project/hnevrdlcqhmsfubakljg
2. Click **Edge Functions** in the left sidebar
3. Look for **Secrets** or **Environment Variables**
4. Check if `RESEND_API_KEY` exists

### If RESEND_API_KEY is missing:

1. Get your Resend API key from: https://resend.com/api-keys
2. In Supabase Dashboard → Edge Functions → Secrets
3. Click **Add Secret**
4. Name: `RESEND_API_KEY`
5. Value: `re_xxxxxxxxxxxxxxxxxxxx` (your Resend API key)
6. Click **Save**

### After adding the secret:

You may need to redeploy the function:

```powershell
cd "D:\Matepeak\Project\spark-mentor-connect-08475-37914-35681--84739"
supabase functions deploy send-email --project-ref hnevrdlcqhmsfubakljg
```

## Check Edge Function Logs

To see the exact error from the Edge Function:

### Option 1: Via CLI (if you have Supabase CLI)

```powershell
supabase functions logs send-email --project-ref hnevrdlcqhmsfubakljg
```

### Option 2: Via Dashboard

1. Go to https://supabase.com/dashboard/project/hnevrdlcqhmsfubakljg/functions
2. Click on **send-email** function
3. Click **Logs** tab
4. Look for the most recent error (should show the actual error message)

## Test the Email Function Directly

Once you've added the RESEND_API_KEY, test it directly:

### In your browser console:

```javascript
const { data, error } = await supabase.functions.invoke("send-email", {
  body: {
    to: "your-email@example.com", // Use your actual email
    subject: "Test Email",
    html: "<h1>Test</h1><p>This is a test email</p>",
  },
});

console.log("Response:", { data, error });
```

If this works, you'll receive a test email!

## Common Issues & Solutions

### Issue 1: "RESEND_API_KEY is not configured"

**Solution:** Add the secret as described above

### Issue 2: "Failed to send email" from Resend

**Solution:** Check your Resend account:

- Is it verified?
- Have you added/verified your domain?
- Are you using the correct API key?

### Issue 3: "Invalid from address"

**Solution:** Update the from address in the Edge Function:

- Free Resend accounts can only send from `onboarding@resend.dev`
- Paid accounts need a verified domain

### Issue 4: Email works but student doesn't receive it

**Solution:**

- Check spam folder
- Verify the student's email in the database
- Check Resend dashboard for delivery status

## Next Steps

1. ✅ Check if RESEND_API_KEY is set in Supabase
2. ✅ If missing, add it
3. ✅ Check Edge Function logs for exact error
4. ✅ Test with the console command above
5. ✅ Try approving a time request again

## Support

If you're still having issues:

1. Share the Edge Function logs
2. Confirm RESEND_API_KEY is set
3. Try the test command in browser console
