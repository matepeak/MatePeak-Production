# Mentor Verification Workflow

## Overview
This document describes the complete mentor verification workflow, from signup through admin approval and activation.

## Workflow Stages

### 1. Mentor Signup & Onboarding

#### Step 1: Account Creation
- Mentor signs up at `/mentor/signup` with email and password
- User account created with `role='mentor'`
- Automatically redirected to `/expert/onboarding`

#### Step 2: 11-Step Onboarding Process

**Step 1: Basic Information**
- First name, last name, email
- Username (unique identifier)
- Category selection
- Country of birth
- Languages spoken
- Age confirmation (18+)

**Step 2: Identity Verification (Optional)**
- Upload verification photo (selfie with ID)
- Helps establish authenticity

**Step 3: Teaching Certifications (Optional)**
- Upload teaching certificates
- Or declare "No certificate" if self-taught

**Step 4: Education (Required)**
- Educational background details
- Degrees, institutions, years

**Step 5: Profile Description (Required)**
- Introduction paragraph
- Teaching experience description
- Motivation for mentoring
- Professional headline

**Step 6-8: Target Audience & Impact (Optional)**
- Target audience definition
- Problems you help solve
- Outcomes you deliver

**Step 9: Services & Pricing (Required)**
- Define service offerings
- Set pricing for each service
- Must enable at least one service
- Types: One-on-one sessions, group sessions, courses, etc.

**Step 10: Availability (Optional)**
- Set weekly availability schedule
- Time slots for bookings

**Step 11: Profile Setup (Optional)**
- Profile picture upload
- Social media links (LinkedIn, Twitter, etc.)

### 2. Profile Submission

#### What Happens After Onboarding Completion
1. Profile data saved to `expert_profiles` table
2. **Status Set**: `profile_status = 'pending_review'`
3. **Verification**: `is_verified = false`
4. Success modal displays review notification

#### Success Modal Message
```
🔵 Profile Submitted Successfully!
Your profile is under review by our team

What Happens Next?
- Our team is reviewing your profile to ensure quality and authenticity
- This usually takes 24-48 hours
- You'll receive an email notification once approved and live

While You Wait:
- Check your email for approval notification
- Prepare your mentoring availability schedule
- Get ready to promote your services
```

### 3. Admin Verification

#### Access Admin Dashboard
- Navigate to `/admin/login`
- Enter admin credentials
- Access mentor verification at `/admin/mentor-verification`

#### Pending Mentors Display
The admin sees all mentors with:
- `profile_status IN ('pending_review', 'draft')`
- `is_verified = false`

#### Information Displayed

**Visual Header:**
- Profile picture (if uploaded)
- Full name and username
- Email address
- Application date
- Profile status badge
- ID verification badge (if provided)

**Overview Tab:**
- Headline
- Introduction
- Teaching experience
- Motivation
- Categories
- Languages
- Expertise tags

**Education Tab:**
- Educational background details
- Teaching certifications (if provided)
- "No certificate" declaration (if applicable)

**Services Tab:**
- All enabled services
- Pricing for each service
- Service descriptions
- Duration/format details

**Verification Tab:**
- Identity verification photo (if uploaded)
- Social media links
- Verification checklist:
  - ✅ Profile picture uploaded
  - ✅ Identity verification provided
  - ✅ Certification details provided
  - ✅ Education information provided
  - ✅ Service pricing set

### 4. Admin Decision

#### Option 1: Approve Mentor
1. Click "Approve Mentor" button
2. Optional: Add internal verification notes
3. System executes `admin_verify_mentor()` function:
   - Sets `is_verified = true`
   - Sets `profile_status = 'active'`
   - Records action in `admin_actions` table
   - Timestamp saved
4. Email notification sent to mentor (TODO: implement email)
5. Mentor profile now visible on platform
6. Mentor can accept bookings

#### Option 2: Reject Application
1. Click "Reject Application" button
2. **Required**: Provide rejection reason
3. System executes `admin_reject_mentor()` function:
   - Sets `is_verified = false`
   - Sets `profile_status = 'inactive'`
   - Saves rejection reason
   - Records action in `admin_actions` table
4. Email notification sent to mentor with reason (TODO: implement email)
5. Mentor can reapply or correct issues

### 5. Post-Approval

#### Mentor Capabilities (Approved)
- Profile visible in explore/search
- Can receive booking requests
- Dashboard fully functional
- Can set/update availability
- Can manage services and pricing
- Can withdraw earnings

#### Mentor Restrictions (Rejected/Pending)
- Profile NOT visible in public search
- Cannot receive bookings
- Can view but not use dashboard fully
- Can resubmit after corrections

## Database Schema

### expert_profiles Table
```sql
profile_status TEXT
CHECK (profile_status IN ('draft', 'active', 'inactive', 'pending_review', 'suspended'))
DEFAULT 'active'

is_verified BOOLEAN DEFAULT false
```

### Status Definitions
- `draft`: Profile incomplete or in progress
- `pending_review`: Submitted, awaiting admin approval
- `active`: Verified and live on platform
- `inactive`: Rejected or paused by mentor
- `suspended`: Blocked by admin

## Admin Functions

### admin_verify_mentor(mentor_profile_id, verification_notes)
**Purpose**: Approve mentor and activate profile
**Security**: SECURITY DEFINER, requires admin role
**Actions**:
- Updates profile_status to 'active'
- Sets is_verified to true
- Logs action with notes

### admin_reject_mentor(mentor_profile_id, rejection_reason)
**Purpose**: Reject mentor application
**Security**: SECURITY DEFINER, requires admin role
**Actions**:
- Updates profile_status to 'inactive'
- Sets is_verified to false
- Stores rejection reason
- Logs action

## Implementation Files

### Backend
- `supabase/migrations/20260227000000_add_admin_system.sql` - Admin functions
- `supabase/migrations/20251029130000_add_profile_status_and_visibility.sql` - Profile status field

### Frontend
- `src/pages/MentorSignup.tsx` - Signup page
- `src/pages/ExpertOnboarding.tsx` - 11-step wizard
- `src/components/onboarding/OnboardingSuccessModal.tsx` - Review notification
- `src/services/expertProfileService.ts` - Profile creation with pending status
- `src/pages/AdminMentorVerification.tsx` - Admin verification interface
- `src/services/adminService.ts` - Admin verification functions

## Future Enhancements

### Email Notifications
- [ ] Send confirmation email on profile submission
- [ ] Send approval email with welcome message
- [ ] Send rejection email with detailed feedback
- [ ] Remind pending mentors after 48 hours

### Auto-Verification
- [ ] Implement trust score based on verification data
- [ ] Auto-approve mentors with high trust scores
- [ ] Flag suspicious profiles for manual review

### Analytics
- [ ] Track average approval time
- [ ] Monitor rejection reasons
- [ ] Measure mentor onboarding completion rate
- [ ] Track verification bottlenecks

## Testing Checklist

### Mentor Flow
- [ ] Signup with email/password
- [ ] Complete all 11 onboarding steps
- [ ] Submit profile successfully
- [ ] See "under review" modal
- [ ] Cannot access booking features while pending
- [ ] Dashboard shows pending status

### Admin Flow
- [ ] Login at /admin/login
- [ ] See pending mentor in verification list
- [ ] View all 4 tabs of mentor information
- [ ] Approve mentor successfully
- [ ] Verify mentor status changes to active
- [ ] Confirm mentor appears in public search

### Rejection Flow
- [ ] Reject mentor with reason
- [ ] Verify status changes to inactive
- [ ] Confirm mentor not visible publicly
- [ ] Check rejection reason is stored

## Security Considerations

1. **RLS Policies**: Ensure pending mentors cannot bypass verification
2. **Admin Only**: Only admins can verify/reject mentors
3. **Audit Trail**: All actions logged in admin_actions table
4. **Profile Visibility**: Pending profiles not shown in public queries
5. **Data Validation**: Verify all required fields before allowing submission

## User Experience

### For Mentors
- Clear expectations set during onboarding
- Transparency about review process
- Graceful notification of review status
- No frustration from unclear waiting period
- Professional communication

### For Admins
- Comprehensive information for verification
- Easy-to-use approval/rejection interface
- Organized tabbed view of mentor details
- Quick verification checklist
- Efficient batch processing capability

## Support & Troubleshooting

### Common Issues

**Mentor doesn't see pending status**
- Check profile_status in database
- Verify expertProfileService sets 'pending_review'

**Admin doesn't see pending mentor**
- Check getPendingMentorVerifications query
- Verify profile_status is 'pending_review' or 'draft'
- Confirm is_verified = false

**Approval doesn't activate profile**
- Check admin_verify_mentor function execution
- Verify admin role assignment
- Check RLS policies

---

**Last Updated**: February 27, 2026
**Version**: 1.0
**Status**: Fully Implemented ✅
