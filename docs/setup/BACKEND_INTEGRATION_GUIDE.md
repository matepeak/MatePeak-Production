# Backend Integration Implementation Guide

> **📝 NOTE (March 2026):** "Chat Advice" service type is now "Priority DM" in all new code and database schemas. This document retains legacy references for historical documentation purposes.

## Overview

This document describes the backend integration for the MatePeak booking system, including booking submission and real-time availability checking.

## Features Implemented

### 1. Booking Submission ✅

- Creates booking records in the database
- Associates bookings with users and mentors
- Tracks booking status (pending, confirmed, completed, cancelled)
- Stores session details (date, time, duration, price)
- Handles add-ons (session recording)

### 2. Real Availability Integration ✅

- Fetches mentor's recurring availability slots
- Checks specific date availability
- Accounts for blocked dates
- Shows only available time slots
- Prevents double-booking

## Database Schema

### Tables Used

#### `bookings`

```sql
- id: UUID (Primary Key)
- user_id: UUID (References auth.users)
- expert_id: UUID (References expert_profiles)
- session_type: TEXT (oneOnOneSession, chatAdvice, etc.)
- scheduled_date: DATE
- scheduled_time: TEXT (HH:MM format)
- duration: INTEGER (minutes)
- status: TEXT (pending, confirmed, completed, cancelled)
- message: TEXT (purpose/notes)
- total_amount: NUMERIC
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `availability_slots`

```sql
- id: UUID (Primary Key)
- expert_id: UUID (References expert_profiles)
- day_of_week: INTEGER (0-6, Sunday-Saturday)
- start_time: TEXT (HH:MM)
- end_time: TEXT (HH:MM)
- is_recurring: BOOLEAN
- specific_date: DATE (for non-recurring slots)
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### `blocked_dates`

```sql
- id: UUID (Primary Key)
- expert_id: UUID (References expert_profiles)
- date: DATE
- reason: TEXT
- created_at: TIMESTAMP
```

## Services Created

### `bookingService.ts`

Located at: `src/services/bookingService.ts`

#### Main Functions

##### 1. `createBooking(data: CreateBookingData)`

Creates a new booking in the database.

**Parameters:**

```typescript
{
  expert_id: string;
  session_type: string;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time: string; // HH:MM
  duration: number;
  message?: string;
  total_amount: number;
  user_name?: string;
  user_email?: string;
  user_phone?: string;
  add_recording?: boolean;
}
```

**Returns:**

```typescript
{
  success: boolean;
  data: Booking | null;
  error?: string;
  message?: string;
}
```

**Usage:**

```typescript
const result = await createBooking({
  expert_id: "uuid-123",
  session_type: "oneOnOneSession",
  scheduled_date: "2025-11-15",
  scheduled_time: "14:00",
  duration: 60,
  message: "Need help with React",
  total_amount: 2000,
});
```

##### 2. `getMentorAvailability(mentorId, startDate, endDate)`

Fetches mentor's availability configuration.

**Returns:**

```typescript
{
  success: boolean;
  data: {
    recurringSlots: AvailabilitySlot[];
    specificSlots: AvailabilitySlot[];
    blockedDates: BlockedDate[];
  };
}
```

##### 3. `getAvailableTimeSlots(mentorId, date, duration)`

Generates available time slots for a specific date.

**Algorithm:**

1. Fetch mentor's recurring and specific availability
2. Check if date is blocked
3. Get existing bookings for the date
4. Generate time slots in 30-minute intervals
5. Filter out booked slots
6. Return only available slots

**Returns:**

```typescript
{
  success: boolean;
  data: TimeSlot[]; // [{ time: "14:00", available: true }]
  error?: string;
}
```

##### 4. `getBookedSlots(mentorId, date)`

Gets all booked time slots for a specific date.

##### 5. `getUserBookings()`

Fetches all bookings for the current user.

##### 6. `getMentorBookings()`

Fetches all bookings received by the mentor.

##### 7. `cancelBooking(bookingId)`

Cancels a booking (updates status to 'cancelled').

## Component Updates

### DateTimeSelection.tsx

**Changes:**

- Added `useState` for `timeSlots` and `loadingSlots`
- Added `useEffect` to fetch slots when date changes
- Integrated `getAvailableTimeSlots` service
- Shows loading spinner while fetching
- Displays "No available slots" message when empty
- Filters and displays only available time slots

**Key Code:**

```typescript
useEffect(() => {
  if (selectedDate) {
    fetchTimeSlots();
  }
}, [selectedDate, mentorId, selectedService.duration]);

const fetchTimeSlots = async () => {
  setLoadingSlots(true);
  const result = await getAvailableTimeSlots(
    mentorId,
    selectedDate,
    selectedService.duration
  );
  if (result.success) {
    setTimeSlots(result.data);
  }
  setLoadingSlots(false);
};
```

### BookingDialog.tsx

**Changes:**

- Added `useNavigate` hook
- Added `isSubmitting` state
- Integrated `createBooking` service
- Added error handling with toast notifications
- Navigates to success page on completion

**Key Code:**

```typescript
const handleBookingSubmit = async (details: BookingDetails) => {
  setIsSubmitting(true);
  const result = await createBooking(bookingData);

  if (result.success) {
    toast.success("Booking created successfully!");
    navigate(`/booking-success?id=${result.data?.id}`);
  } else {
    toast.error(result.error);
  }
  setIsSubmitting(false);
};
```

### BookingConfirmation.tsx

**Changes:**

- Added `isSubmitting` prop
- Auto-fills user name and email from profile
- Shows loading state on submit button
- Displays "Processing..." with spinner when submitting

**Key Code:**

```typescript
useEffect(() => {
  const fetchUserData = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      setEmail(user.email || "");
      // Fetch name from profiles table
    }
  };
  fetchUserData();
}, []);
```

### BookingSuccess.tsx

**Changes:**

- Fetches booking details by ID from URL params
- Displays real booking information
- Shows session type, date, time, duration, price
- Provides "Add to Calendar" functionality (ICS file download)
- Error handling for missing/invalid bookings

## User Flow

```
1. User clicks "Book Session" button on mentor profile
   ↓
2. Service Selection (Step 1)
   - User selects service type and duration
   ↓
3. Date/Time Selection (Step 2)
   - User selects date
   - System fetches available time slots from database
   - Filters out: blocked dates, already booked slots
   - User selects available time slot
   ↓
4. Booking Confirmation (Step 3)
   - System pre-fills user's name and email
   - User enters purpose and optional details
   - User reviews order summary
   ↓
5. Booking Submission
   - System creates booking record in database
   - Status: "pending" (awaiting mentor confirmation)
   ↓
6. Success Page
   - Displays booking confirmation
   - Shows all session details
   - Option to add to calendar
   - Link to dashboard
```

## API Calls Flow

### When Opening Booking Dialog

No API calls (uses cached mentor data from profile page)

### When Selecting Date (Step 2)

```
1. getAvailableTimeSlots()
   └─→ getMentorAvailability()
       ├─→ Query: availability_slots (recurring)
       ├─→ Query: availability_slots (specific dates)
       └─→ Query: blocked_dates
   └─→ getBookedSlots()
       └─→ Query: bookings (existing bookings for date)
```

### When Submitting Booking (Step 3)

```
1. createBooking()
   └─→ Insert: bookings table
   └─→ Returns: booking record with ID
```

### On Success Page Load

```
1. Fetch booking by ID
   └─→ Query: bookings + join expert_profiles
   └─→ Returns: full booking details with mentor info
```

## Security & Permissions

### Row Level Security (RLS)

#### Bookings Table

- **SELECT**: Users can view their own bookings OR bookings where they are the mentor
- **INSERT**: Users can create bookings (user_id must match auth.uid())
- **UPDATE**: Only mentors can update bookings where they are the expert
- **DELETE**: Not allowed (use status = 'cancelled' instead)

#### Availability Slots Table

- **SELECT**: Public (anyone can view)
- **INSERT/UPDATE/DELETE**: Only the mentor who owns the slots

#### Blocked Dates Table

- **SELECT**: Public (anyone can view)
- **INSERT/DELETE**: Only the mentor who owns the blocked dates

## Error Handling

### Common Errors

#### "You must be logged in to book a session"

- **Cause**: User not authenticated
- **Solution**: Redirect to login page

#### "Failed to fetch availability"

- **Cause**: Network error or mentor has no availability set up
- **Solution**: Show friendly error message, allow user to request custom time

#### "No available slots for this date"

- **Cause**: Date is fully booked or blocked
- **Solution**: Suggest alternative dates or allow custom time request

#### "Failed to create booking"

- **Cause**: Database error, validation error, or slot just got booked
- **Solution**: Show error message, refresh availability

## Testing Scenarios

### Test Case 1: Complete Booking Flow

1. Select mentor profile
2. Click "Book Session"
3. Choose 1:1 Session (60 min)
4. Select tomorrow's date
5. Verify time slots appear
6. Select a time slot
7. Fill in booking details
8. Submit booking
9. Verify success page shows correct details

### Test Case 2: No Availability

1. Select mentor with no availability set up
2. Choose date
3. Verify "No available slots" message appears

### Test Case 3: Blocked Date

1. Mentor blocks specific date
2. Student selects that date
3. Verify no time slots appear

### Test Case 4: Double Booking Prevention

1. Book a slot for 2:00 PM (60 min)
2. Try to book 2:30 PM (60 min) for same mentor
3. Verify 2:30 slot is not available (conflict with 2:00-3:00)

### Test Case 5: Different Durations

1. Book 30-minute session
2. Verify smaller time slots available
3. Book 90-minute session
4. Verify fewer slots available (needs longer continuous time)

## Performance Optimizations

### Implemented

1. **Batch Queries**: Fetch all availability data in one call
2. **Client-side Filtering**: Process time slots in browser
3. **Lazy Loading**: Only fetch slots when date is selected
4. **Caching**: Mentor data cached from profile page

### Future Improvements

1. **Server-side Processing**: Move time slot generation to Edge Function
2. **Real-time Updates**: Use Supabase subscriptions for live availability
3. **Caching Layer**: Cache availability for 5-10 minutes
4. **Pagination**: For mentors with many bookings

## Integration with Payment Gateway

### Next Steps (Not Yet Implemented)

1. **Before Creating Booking**:

   ```typescript
   // Initiate payment
   const paymentResult = await initiatePayment({
     amount: totalAmount,
     currency: "INR",
     booking_details: bookingData,
   });

   if (paymentResult.success) {
     // Proceed with booking creation
   }
   ```

2. **After Payment Success**:

   ```typescript
   // Create booking with payment info
   const booking = await createBooking({
     ...bookingData,
     payment_id: paymentResult.payment_id,
     payment_status: "completed",
   });
   ```

3. **Update Status Field**:
   - Add `payment_status` column to bookings table
   - Values: 'pending', 'completed', 'failed', 'refunded'

## Monitoring & Analytics

### Key Metrics to Track

1. **Booking Conversion Rate**: Profile views → Bookings
2. **Availability Coverage**: % of dates with available slots
3. **Time Slot Utilization**: Most popular times
4. **Booking Status Distribution**: Pending vs Confirmed vs Completed
5. **Average Booking Value**: Track with/without add-ons

### Logging Points

```typescript
// Log booking attempts
console.log("Booking attempt:", {
  mentor_id,
  service_type,
  date,
  time,
});

// Log booking success
console.log("Booking created:", {
  booking_id,
  total_amount,
});

// Log errors
console.error("Booking failed:", {
  error,
  context: bookingData,
});
```

## Troubleshooting

### Issue: Time slots not appearing

**Check:**

1. Does mentor have availability set up?
2. Is the date blocked?
3. Are all slots already booked?
4. Check browser console for errors

### Issue: Booking creation fails

**Check:**

1. Is user logged in?
2. Does mentor profile exist?
3. Are all required fields provided?
4. Check database logs for constraint violations

### Issue: Double bookings happening

**Check:**

1. Review `isTimeBooked()` logic
2. Check if bookings are being created without checking availability
3. Verify RLS policies allow reading existing bookings

## Future Enhancements

### Short Term

1. ✅ Booking submission
2. ✅ Real availability checking
3. ⏳ Payment integration
4. ⏳ Email notifications
5. ⏳ Calendar sync (Google Calendar, Outlook)

### Medium Term

1. Recurring bookings (weekly sessions)
2. Group sessions support
3. Waitlist for fully booked slots
4. Availability suggestions (AI-powered)
5. Timezone conversion support

### Long Term

1. Video call integration (Zoom, Google Meet)
2. Automated reminders (24h, 1h before)
3. Session recording storage
4. AI meeting summaries
5. Analytics dashboard for mentors

## Maintenance

### Database Indexes

Current indexes improve query performance:

```sql
- idx_bookings_user_id
- idx_bookings_expert_id
- idx_bookings_scheduled_date
- idx_availability_slots_expert_id
- idx_availability_slots_day_of_week
- idx_blocked_dates_expert_id
- idx_blocked_dates_date
```

### Cleanup Jobs

Recommended scheduled jobs:

1. **Archive Old Bookings**: Monthly, move completed bookings >6 months old
2. **Remove Past Blocked Dates**: Weekly, clean up blocked_dates older than today
3. **Cancel Abandoned Bookings**: Daily, cancel pending bookings >7 days old

## Support

For issues or questions:

1. Check browser console for errors
2. Review Supabase logs for database errors
3. Verify RLS policies in Supabase dashboard
4. Test with different user roles (student, mentor)

---

**Last Updated**: November 1, 2025
**Status**: ✅ Production Ready
**Version**: 1.0.0
