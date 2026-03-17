# Booking System Testing Guide

> **📝 NOTE (March 2026):** "Chat Advice" is now called "Priority DM" in the codebase and database. References to "Chat Advice" in this guide reflect the legacy naming used during earlier implementation phases.

## Quick Start

1. **Navigate to any mentor's public profile**

   - URL format: `/mentor/@username`
   - Example: `/mentor/@johndoe`

2. **Look for the "Book Session" button**

   - Located in the ProfileHeader card (right sidebar on desktop)
   - Below social links section
   - Full-width, dark gray button
   - Should NOT appear on your own profile

3. **Click "Book Session"** to open the booking modal

## Step-by-Step Testing

### Step 1: Service Selection

**What to Check:**

- [ ] Modal opens with title "Book a Session"
- [ ] All enabled services are displayed as cards
- [ ] Each card shows service name and icon
- [ ] For "1:1 Session", duration tabs appear (30/60/90 min)
- [ ] Price updates when changing duration
- [ ] "Free Demo Available" badge shows if applicable
- [ ] "Select →" button appears on each card
- [ ] Clicking Select moves to Step 2

**Test Cases:**

1. Select 1:1 Session with 30 min → Should show correct price
2. Change to 60 min → Price should update
3. Select Chat Advice → Should proceed without duration tabs
4. Click X or outside modal → Modal should close

**Expected Behavior:**

```
Services Grid:
┌─────────────┬─────────────┐
│ 1:1 Session │ Chat Advice │
│ ₹2000       │ ₹500        │
│ [30|60|90]  │             │
│ Select →    │ Select →    │
└─────────────┴─────────────┘
┌─────────────┬─────────────┐
│  Digital    │ Session     │
│  Products   │ Notes       │
│  ₹1500      │ ₹300        │
│  Select →   │ Select →    │
└─────────────┴─────────────┘
```

### Step 2: Date & Time Selection

**What to Check:**

- [ ] Selected service displayed at top
- [ ] Price shown correctly
- [ ] "Change Service" link works (goes back to Step 1)
- [ ] Date picker shows horizontal scrollable days
- [ ] Current/selected date highlighted
- [ ] Time slots displayed in grid (3 columns)
- [ ] Clicking time slot highlights it
- [ ] Timezone selector dropdown works
- [ ] "Continue" button disabled until both date & time selected
- [ ] "Continue" enabled after selections made

**Test Cases:**

1. Click "Change Service" → Should go back to Step 1 with service pre-selected
2. Select today's date → Should be allowed
3. Select past date → Should be disabled (if implemented)
4. Select time slot → Should highlight with dark border
5. Change timezone → Should update display
6. Click Continue without selections → Should remain disabled
7. Select both → Continue should enable and proceed to Step 3

**Expected Behavior:**

```
Service Summary:
1:1 Session (60 min) - ₹2000

Dates: [Today] [Tomorrow] [Day+2] [Day+3] ...
Times:
┌─────────┬─────────┬─────────┐
│ 09:00   │ 10:00   │ 11:00   │
│ 12:00   │ 13:00   │ 14:00   │
│ 15:00   │ 16:00   │ 17:00   │
└─────────┴─────────┴─────────┘

Timezone: [Asia/Kolkata ▼]
```

### Step 3: Booking Confirmation

**What to Check:**

- [ ] Service + DateTime summary displayed
- [ ] "Change" button next to date/time (goes back to Step 2)
- [ ] Form fields: Name, Email, Phone, Purpose
- [ ] All fields are required (validation)
- [ ] "Add Session Recording" checkbox works
- [ ] Recording price (₹300) shown next to checkbox
- [ ] "Order Summary" section is collapsible
- [ ] Price breakdown shows:
  - Service price
  - Recording price (if selected)
  - Total price
- [ ] "Confirm and Pay" button present

**Test Cases:**

1. Click "Change" next to date → Should go back to Step 2 with date/time pre-selected
2. Try to submit empty form → Should show validation errors
3. Check "Add Recording" → Order total should increase by ₹300
4. Uncheck "Add Recording" → Order total should decrease by ₹300
5. Toggle "Order Summary" → Should expand/collapse
6. Fill all fields → "Confirm and Pay" should be enabled
7. Click "Confirm and Pay" → Should submit booking (currently logs to console)

**Expected Behavior:**

```
Summary:
1:1 Session (60 min)
Tomorrow, 3:00 PM (Asia/Kolkata) [Change]

Your Details:
Name: [________________]
Email: [________________]
Phone: [________________]
Purpose: [____________________
          ____________________]

□ Add Session Recording (₹300)

Order Summary ▼
Service: ₹2000
Recording: ₹300
Total: ₹2300
```

## Edge Cases to Test

### Empty States

- [ ] Mentor has no services enabled → Should show message
- [ ] Mentor has only free sessions → Should show ₹0
- [ ] No time slots available → Should show message

### Data Persistence

- [ ] Go Step 1 → Step 2 → Back → Should remember selected service
- [ ] Go Step 2 → Step 3 → Back → Should remember selected date/time
- [ ] Close modal mid-flow → Reopen → Should start fresh at Step 1

### Responsive Design

- [ ] Mobile (<640px): Cards should stack vertically
- [ ] Tablet (640-1024px): 2 cards per row
- [ ] Desktop (>1024px): 2 cards per row
- [ ] Date picker scrolls horizontally on mobile
- [ ] Time slots are readable on mobile (touch-friendly)

### Accessibility

- [ ] Tab navigation works through all interactive elements
- [ ] Esc key closes modal
- [ ] Focus trap within modal
- [ ] Screen reader announces step changes
- [ ] ARIA labels on buttons

## Visual Inspection

### Design Consistency

- [ ] Matches project color scheme (gray-900, gray-600)
- [ ] Buttons use consistent styling
- [ ] Cards have subtle borders and shadows
- [ ] Icons are appropriately sized
- [ ] Typography matches rest of site
- [ ] Spacing is consistent

### Dark Mode (if applicable)

- [ ] All text is readable
- [ ] Cards have appropriate contrast
- [ ] Buttons are visible
- [ ] Selected states are clear

## Performance Testing

- [ ] Modal opens smoothly (<100ms)
- [ ] Step transitions are instant
- [ ] No layout shift during transitions
- [ ] Scroll position preserved on back navigation
- [ ] No console errors during normal flow

## Integration Testing

### With Real Data

- [ ] Test with mentor who has all services enabled
- [ ] Test with mentor who has only 1:1 sessions
- [ ] Test with mentor who has only chat advice
- [ ] Test with free demo pricing
- [ ] Test with high prices (₹10,000+)

### Multi-User Scenarios

- [ ] Logged in user → Should work normally
- [ ] Logged out user → Should work (or prompt login if required)
- [ ] Mentor viewing own profile → Button should NOT appear
- [ ] Different mentor viewing profile → Button SHOULD appear

## Known Limitations (Current MVP)

1. **Mock Time Slots**: Currently showing hardcoded times
   - Real availability integration needed
2. **No Payment Processing**: Button logs to console
   - Payment gateway integration required
3. **No Booking Persistence**: Data not saved to database
   - Backend API endpoint needed
4. **No Email Confirmations**: User gets no confirmation

   - Email service integration needed

5. **Timezone Handling**: Basic implementation
   - More robust timezone conversion needed

## Debugging Tips

### Modal Not Opening

- Check console for errors
- Verify `bookingDialogOpen` state updates
- Check if button onClick handler fires

### Step Not Changing

- Console.log the `step` state
- Verify onNext/onBack callbacks
- Check if data validation prevents progression

### Prices Not Showing

- Verify `service_pricing` object structure
- Check if service is enabled
- Look for undefined/null values

### Form Validation Issues

- Check if all required fields marked
- Verify validation logic in BookingConfirmation
- Look for console warnings

## Success Criteria

The booking system is working correctly when:
✅ User can select any enabled service
✅ User can choose date and time
✅ User can enter their details
✅ Order summary shows correct pricing
✅ All navigation (forward/back) works smoothly
✅ Modal can be closed at any step
✅ Design matches the rest of the application
✅ No console errors during normal flow

## Next Steps After Testing

1. **Connect to Backend**

   - Create booking API endpoint
   - Handle booking submission
   - Return booking confirmation

2. **Add Payment**

   - Integrate Razorpay/Stripe
   - Handle payment flow
   - Update booking status

3. **Real Availability**

   - Fetch mentor's actual available slots
   - Show blocked dates
   - Handle timezone conversions

4. **Notifications**
   - Send booking confirmation email
   - Calendar invite
   - SMS notifications

---

**Testing Date**: ****\_****
**Tested By**: ****\_****
**Browser**: ****\_****
**Device**: ****\_****
**Issues Found**: ****\_****
