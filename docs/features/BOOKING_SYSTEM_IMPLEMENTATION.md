# Booking System Implementation Guide

> **📝 NOTE (March 2026):** "Chat Advice" service type has been renamed to "Priority DM" across all codebase (both TypeScript and database). This document uses legacy naming for historical reference. See [PRIORITY_DM_IMPLEMENTATION_SPEC.md](./PRIORITY_DM_IMPLEMENTATION_SPEC.md) for current naming.

## Overview

Implemented a complete 3-step booking flow modal system inspired by TopMate's UX, integrated into the mentor public profile page.

## Architecture

### Components Created

1. **BookingDialog.tsx** (`src/components/booking/`)

   - Main orchestrator component
   - Manages 3-step flow state machine
   - Props: mentorId, mentorName, mentorImage, services, servicePricing, timezone
   - State management: step (1|2|3), selectedService, selectedDateTime, bookingDetails
   - Features: Back navigation, step transitions, data persistence across steps

2. **ServiceSelection.tsx** (Step 1)

   - Displays available services in a grid layout
   - Service types: 1:1 Session, Chat Advice, Digital Products, Session Notes
   - Duration tabs for 1:1 sessions (30/60/90 minutes)
   - Pricing display with ₹ symbol
   - "Free Demo Available" badge when applicable
   - "Select →" button per service card

3. **DateTimeSelection.tsx** (Step 2)

   - Service summary with pricing at top
   - Horizontal scrollable date picker (7 days visible)
   - Time slots grid (3 columns, responsive)
   - Timezone selector dropdown
   - "Continue" button activates when all selections made
   - "Change Service" link to go back

4. **BookingConfirmation.tsx** (Step 3)
   - Service & DateTime summary with "Change" button
   - User details form: name, email, phone, purpose (textarea)
   - Add-on: Session recording checkbox (₹300)
   - Collapsible order summary with price breakdown
   - "Confirm and Pay" button

### Integration Points

**ProfileHeader.tsx** (`src/components/profile/`)

- Added "Book Session" button (full-width, prominent)
- Button only shows for other users' profiles (!isOwnProfile)
- Opens BookingDialog modal on click
- Passes all necessary props from mentor object

**MentorPublicProfile.tsx** (`src/pages/`)

- Already provides all required data via mentor object
- services, service_pricing, timezone automatically passed down
- No modifications needed

## Design System

### Colors

- Primary buttons: `bg-gray-900 hover:bg-gray-800`
- Secondary buttons: `bg-white border-gray-300`
- Selected state: `border-gray-900 bg-gray-50`
- Text: Gray-900 for headings, Gray-600 for secondary

### Typography

- Headings: `text-xl font-semibold`
- Body: `text-sm text-gray-600`
- Prices: `text-2xl font-bold text-gray-900`

### Layout

- Cards: Clean white backgrounds with subtle borders
- Spacing: Consistent 4-6 spacing units
- Icons: Lucide-react icons (Calendar, Clock, Globe, etc.)

## User Flow

```
Mentor Public Profile
  ↓
Click "Book Session"
  ↓
Step 1: Service Selection
  - Choose service type
  - Select duration (for 1:1)
  - See pricing
  ↓
Step 2: Date/Time Selection
  - Pick date from horizontal calendar
  - Select time slot
  - Confirm timezone
  ↓
Step 3: Booking Confirmation
  - Enter personal details
  - Add optional recording
  - Review order summary
  - Confirm and pay
  ↓
[Payment & Success Page - To be implemented]
```

## Data Structure

### Service Object

```typescript
{
  oneOnOneSession: { enabled: boolean },
  chatAdvice: { enabled: boolean },
  digitalProducts: { enabled: boolean },
  notes: { enabled: boolean }
}
```

### Service Pricing Object

```typescript
{
  oneOnOneSession: {
    30: { enabled: boolean, price: number, hasFreeDemo: boolean },
    60: { enabled: boolean, price: number, hasFreeDemo: boolean },
    90: { enabled: boolean, price: number, hasFreeDemo: boolean }
  },
  chatAdvice: { enabled: boolean, price: number },
  digitalProducts: { enabled: boolean, price: number },
  notes: { enabled: boolean, price: number }
}
```

### Selected Service State

```typescript
{
  type: 'oneOnOneSession' | 'chatAdvice' | 'digitalProducts' | 'notes',
  duration?: 30 | 60 | 90,
  price: number,
  hasFreeDemo?: boolean
}
```

### Selected DateTime State

```typescript
{
  date: string,  // ISO format
  time: string,  // "HH:MM" format
  timezone: string
}
```

### Booking Details State

```typescript
{
  name: string,
  email: string,
  phone: string,
  purpose: string,
  addRecording: boolean
}
```

## Next Steps

### Immediate (Required for MVP)

1. **Backend Integration**

   - Create booking submission endpoint
   - Store booking in `bookings` table
   - Send confirmation emails

2. **Payment Integration**

   - Integrate payment gateway (Razorpay/Stripe)
   - Handle payment success/failure
   - Update booking status

3. **Success Page**
   - Booking confirmation screen
   - Show booking details
   - Calendar invite download
   - Email confirmation message

### Future Enhancements

1. **Real Availability Integration**

   - Fetch actual available slots from mentor's calendar
   - Show blocked dates
   - Real-time slot booking

2. **Multiple Date Selection**

   - Allow booking multiple sessions
   - Package deals
   - Bulk discounts

3. **Rescheduling**

   - Allow users to reschedule bookings
   - Cancellation policy
   - Refund handling

4. **Notifications**

   - Email reminders
   - SMS notifications
   - In-app notifications
   - Calendar sync

5. **Session Types**
   - Video call integration (Zoom/Google Meet)
   - Chat sessions interface
   - Digital product delivery
   - Notes upload system

## Testing Checklist

- [ ] Service selection works for all service types
- [ ] Duration tabs switch correctly for 1:1 sessions
- [ ] Price updates when changing duration
- [ ] Back navigation preserves previous selections
- [ ] Date picker shows correct dates
- [ ] Time slots are clickable and selectable
- [ ] Timezone selector works
- [ ] Form validation on Step 3
- [ ] Recording add-on checkbox works
- [ ] Order summary shows correct calculations
- [ ] Total price includes add-ons
- [ ] "Book Session" button only shows for other profiles
- [ ] Modal closes properly
- [ ] Responsive design works on mobile

## Known Issues

1. TypeScript module resolution warnings - will resolve on server restart
2. Actual availability slots not integrated yet (using mock data)
3. Payment gateway not connected
4. No booking persistence to database yet

## Files Modified/Created

### Created

- `src/components/booking/BookingDialog.tsx` (180 lines)
- `src/components/booking/ServiceSelection.tsx` (210 lines)
- `src/components/booking/DateTimeSelection.tsx` (195 lines)
- `src/components/booking/BookingConfirmation.tsx` (240 lines)

### Modified

- `src/components/profile/ProfileHeader.tsx` (added button and dialog integration)

### Dependencies Used

- `@/components/ui/*` (shadcn/ui components)
- `lucide-react` (icons)
- `date-fns` (date formatting)
- React hooks (useState)

## Design Philosophy

1. **Modal over Page Navigation**: Keeps users in context, reduces friction
2. **Progressive Disclosure**: Only show relevant info at each step
3. **Clear Pricing**: Always visible, no surprises
4. **Easy Back Navigation**: Users can change their mind
5. **Mobile-First**: Horizontal scrolling for dates, responsive grids
6. **Minimal Redundancy**: Don't repeat mentor info already on profile
7. **Professional Aesthetics**: Clean, modern, consistent with brand

## Support & Maintenance

- Keep service types aligned with database schema
- Update pricing structure if business model changes
- Monitor booking conversion rates
- Gather user feedback on flow
- A/B test different layouts

---

**Implementation Date**: January 2025
**Status**: Ready for backend integration
**Next Owner**: Backend team for API endpoints
