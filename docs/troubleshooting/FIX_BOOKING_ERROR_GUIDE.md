# 🔧 Fix Booking Error - Complete Guide

## Problem

After attempting to book a session, you're getting an error and the booking is not successful.

## Root Cause

The booking is failing due to one or more of these issues:

1. **Database constraint mismatch**: The `payment_status` column constraint doesn't allow the value being inserted
2. **Missing columns**: Required columns like `payment_status`, `user_name`, `user_email`, etc. may not exist
3. **RLS policy issues**: Row Level Security policies might be blocking the insert

## ✅ Solution

### Step 1: Run the Database Fix (REQUIRED)

1. **Open Supabase Dashboard**: Go to your Supabase project
2. **Navigate to SQL Editor**: Click "SQL Editor" in the left sidebar
3. **Run the fix**: Copy the contents of `fix-booking-error.sql` and paste it into the SQL editor
4. **Execute**: Click "Run" to execute the script

This will:

- ✅ Fix the `payment_status` constraint to accept 'free' value for beta bookings
- ✅ Add all missing required columns
- ✅ Update RLS policies for proper access control
- ✅ Verify the database structure

### Step 2: Code Update (ALREADY DONE)

I've already updated the booking service code to use `payment_status: "free"` instead of `"completed"` for beta bookings.

**File updated**: `src/services/bookingService.ts`

### Step 3: Test the Booking

1. **Save all files** (Ctrl+S)
2. **Refresh your application** in the browser
3. **Try creating a booking again**
4. **Check browser console** (F12) for any remaining errors

## 🔍 How to Verify the Fix Worked

After running the SQL script, you should see output like:

```
✅ All required columns exist!
✅ Booking error fix applied successfully! Try creating a booking now.
```

You'll also see a table showing all the bookings columns with their data types.

## 🐛 Still Having Issues?

If the booking still fails after running the fix:

### 1. Check Browser Console for Exact Error

Open browser console (F12) and look for:

- Red error messages
- Network tab → Failed requests → Response details

### 2. Check Supabase Logs

In Supabase Dashboard:

1. Go to "Logs" → "Postgres Logs"
2. Look for error messages related to bookings
3. Share the exact error message

### 3. Common Issues & Solutions

#### Error: "column does not exist"

**Solution**: Make sure you ran the entire `fix-booking-error.sql` script

#### Error: "new row violates check constraint"

**Solution**: The payment_status constraint is still wrong. Run:

```sql
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_payment_status_check;
ALTER TABLE bookings
ADD CONSTRAINT bookings_payment_status_check
CHECK (payment_status IN ('pending', 'completed', 'paid', 'failed', 'refunded', 'free'));
```

#### Error: "permission denied for table bookings"

**Solution**: RLS policy issue. Run:

```sql
CREATE POLICY "Users can create bookings"
ON bookings FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

#### Error: "duplicate key value violates unique constraint"

**Solution**: There's already a booking at that time. This is the conflict detection working correctly.

## 📊 What Changed

### Database Changes

- ✅ Added `payment_status` column with correct constraint
- ✅ Added `user_name`, `user_email`, `user_phone` columns
- ✅ Added `price_verified` column for security
- ✅ Added `meeting_link`, `meeting_provider`, `meeting_id` columns
- ✅ Updated RLS policies

### Code Changes

- ✅ Changed `payment_status` from `"completed"` to `"free"` for beta bookings
- ✅ This matches the database constraint and makes the intent clearer

## 🎯 Expected Behavior After Fix

1. ✅ User can select a service
2. ✅ User can pick date/time
3. ✅ User can fill in booking details
4. ✅ **Booking submits successfully**
5. ✅ Success modal appears
6. ✅ User can view booking in dashboard
7. ✅ Booking has meeting link automatically generated

## 📝 Next Steps After Successful Booking

Once bookings work:

1. ✅ Test email notifications (if configured)
2. ✅ Test calendar reminders
3. ✅ Test booking cancellation
4. ✅ Test dashboard views (student & mentor)
5. ✅ Prepare for payment integration (when ready)

## 💡 Why This Happened

During development, the database schema and code got out of sync:

- The code was updated to use `payment_status: "completed"`
- But the database constraint might have only allowed: `'pending', 'failed', 'refunded'`
- Or the column might not have existed at all

This fix ensures everything is aligned and uses the more semantic `"free"` value for beta bookings.

---

**Need More Help?**

If you're still seeing errors after following all steps:

1. Share the exact error message from browser console
2. Share the Supabase logs if possible
3. Let me know what step you're stuck on

The fix should work! Let me know how it goes. 🚀
