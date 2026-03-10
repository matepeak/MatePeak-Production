# Admin System Setup Guide

## 🎉 Implementation Complete!

The admin dashboard with role-based access control has been successfully implemented for MatePeak. All **high-priority features** are ready for use.

## 📋 What's Been Implemented

### 1. Database Layer ✅
**File:** `supabase/migrations/20260227000000_add_admin_system.sql`

- **Admin audit log** - Tracks all admin actions
- **User suspension system** - Suspend/unsuspend accounts
- **Withdrawal requests table** - Manage mentor payment withdrawals
- **Mentor wallet system** - Track earnings and withdrawals
- **Review moderation flags** - Flag and hide inappropriate reviews
- **Admin functions:**
  - `is_admin(user_id)` - Check if user is admin
  - `admin_suspend_user()` - Suspend a user account
  - `admin_unsuspend_user()` - Restore a suspended account
  - `admin_verify_mentor()` - Approve mentor verification
  - `admin_reject_mentor()` - Reject mentor application
  - `admin_approve_withdrawal()` - Approve withdrawal request
  - `admin_reject_withdrawal()` - Reject withdrawal request
  - `admin_moderate_review()` - Hide or delete reviews

### 2. React Hooks ✅
**File:** `src/hooks/useAdminRole.ts`

- `useAdminRole()` - React hook to check admin status with loading states
- `checkIsAdmin()` - Promise-based admin check function

### 3. Admin Service Layer ✅
**File:** `src/services/adminService.ts`

Complete service layer for all admin operations:
- User suspension/unsuspension
- Mentor verification/rejection
- Withdrawal approval/rejection
- Review moderation (hide/delete)
- Data fetching for all admin resources

### 4. Admin Pages ✅

#### Main Dashboard
**File:** `src/pages/AdminDashboard.tsx`
**URL:** `/admin`
- Overview with quick stats
- Navigation to all admin features
- Real-time counts for pending items

#### Mentor Verification
**File:** `src/pages/AdminMentorVerification.tsx`
**URL:** `/admin/mentor-verification`
- View all pending mentor applications
- Approve or reject with notes
- View mentor details, certifications, categories

#### User Management
**File:** `src/pages/AdminUserManagement.tsx`
**URL:** `/admin/user-management`
- Search users by name or email
- Suspend accounts with reason
- Unsuspend accounts
- View all suspended users

#### Withdrawal Management
**File:** `src/pages/AdminWithdrawals.tsx`
**URL:** `/admin/withdrawals`
- View pending withdrawal requests
- Approve with transaction reference
- Reject with funds restoration
- View bank account details

#### Review Moderation
**File:** `src/pages/AdminReviewModeration.tsx`
**URL:** `/admin/review-moderation`
- View flagged reviews
- Hide reviews from public view
- Delete reviews permanently

### 5. Routing ✅
**File:** `src/App.tsx`

All admin routes are configured and protected by admin role check.

---

## 🚀 Deployment Steps

### Step 1: Run Database Migration

1. Open Supabase SQL Editor
2. Run the migration file:
   ```bash
   supabase/migrations/20260227000000_add_admin_system.sql
   ```
3. Verify all tables and functions are created

### Step 2: Create Your First Admin User

After migration, run this SQL to assign admin role to your account:

```sql
-- Replace 'YOUR_EMAIL_HERE' with your actual email
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE'
ON CONFLICT (user_id, role) DO NOTHING;
```

To verify:
```sql
SELECT 
  u.email, 
  ur.role 
FROM user_roles ur
JOIN auth.users u ON u.id = ur.user_id
WHERE ur.role = 'admin';
```

### Step 3: Access Admin Portal

1. Navigate to **`/admin/login`** in your browser
2. **Enter your email and password** (same credentials you use for the main site)
3. If you have admin role, you'll be logged in and redirected to `/admin`
4. If you don't have admin role, you'll see "Access denied. Admin privileges required."

### Step 4: Admin Authentication Flow

```
┌─────────────────┐
│  /admin/login   │ ← Admin login page (email + password)
└────────┬────────┘
         │
         ├─ ✅ Valid credentials + Admin role
         │  └─> Redirect to /admin (dashboard)
         │
         └─ ❌ Invalid or non-admin
            └─> Show error message
```

**Protected Routes:**
- All `/admin/*` routes require authentication
- Non-authenticated users are redirected to `/admin/login`
- Authenticated non-admin users see "Access denied" error

### Step 5: Using the Admin Dashboard

1. **Dashboard**: Overview and quick actions at `/admin`
2. **Logout**: Click "Logout" button in the top-right corner
3. **Navigate**: Use tabs or quick action cards to access features

---

## 🔐 Admin Authentication System

### New Components

1. **AdminAuthContext** (`src/contexts/AdminAuthContext.tsx`)
   - Manages admin authentication state
   - Provides `login()`, `logout()` functions
   - Verifies admin role on login
   - Auto-checks session on mount

2. **AdminLogin Page** (`src/pages/AdminLogin.tsx`)
   - Dedicated login page at `/admin/login`
   - Email + password authentication
   - Validates admin role before granting access
   - Beautiful dark-themed login UI

3. **ProtectedAdminRoute** (`src/components/ProtectedAdminRoute.tsx`)
   - Wraps all admin pages
   - Redirects to `/admin/login` if not authenticated
   - Shows loading skeleton while checking auth

### How It Works

```typescript
// 1. User enters email/password at /admin/login
const { login } = useAdminAuth();
await login(email, password);

// 2. System checks:
//    - Valid Supabase credentials?
//    - User has 'admin' role in user_roles table?

// 3. If both checks pass:
//    - Set admin session
//    - Redirect to /admin

// 4. All admin pages wrapped with:
<ProtectedAdminRoute>
  <AdminDashboard />
</ProtectedAdminRoute>
```

---

## 🎯 Features Implemented

### ✅ High Priority (Complete)

1. **Mentor Verification & Approval**
   - Review mentor applications
   - Approve with verification badge
   - Reject with reason notification
   - View certificates and credentials

2. **User Suspension/Ban**
   - Search and find users
   - Suspend with reason
   - Unsuspend accounts
   - Track suspension history

3. **Review Moderation**
   - View flagged reviews
   - Hide from public (reversible)
   - Delete permanently (irreversible)
   - Track moderation actions

4. **Withdrawal Approval**
   - Review withdrawal requests
   - Approve with transaction ID
   - Reject with funds restoration
   - View bank account details

---

## 🔒 Security Features

1. **Role-Based Access Control**
   - All admin functions check `is_admin()` before execution
   - Frontend guards redirect non-admins
   - RLS policies prevent unauthorized access

2. **Audit Logging**
   - All admin actions are logged in `admin_actions` table
   - Tracks: who, what, when, why
   - Permanent record for compliance

3. **SECURITY DEFINER Functions**
   - Admin functions use elevated privileges
   - Prevent direct table manipulation
   - Enforce business logic

---

## 📊 Database Tables

### New Tables
- `admin_actions` - Audit log of all admin actions
- `withdrawal_requests` - Mentor withdrawal requests
- `mentor_wallets` - Mentor earnings tracking

### Modified Tables
- `profiles` - Added suspension fields
- `reviews` - Added moderation flags

---

## 🎨 UI Components Used

- Shadcn UI (Cards, Buttons, Dialogs, Badges, etc.)
- Lucide Icons (Shield, Award, DollarSign, Flag, etc.)
- Toast notifications for user feedback
- Loading skeletons for better UX

---

## 📝 Next Steps (Medium/Low Priority)

### Medium Priority
- Platform analytics dashboard
- Category management interface
- Financial oversight reports
- Fraud detection alerts

### Low Priority
- System settings/announcements
- Advanced audit log filtering
- Email templates for admin actions
- Bulk actions support

---

## 🐛 Troubleshooting

### "Unauthorized: Admin access required"
- Verify your user has admin role in `user_roles` table
- Check `is_admin()` function returns true

### Admin pages show blank/redirect
- Ensure you're logged in
- Verify admin role assignment
- Check browser console for errors

### Functions not found
- Run the migration SQL file
- Check Supabase function list in dashboard
- Verify RLS is enabled on tables

---

## 📞 Support

For issues or questions:
1. Check Supabase logs for function errors
2. Verify RLS policies are active
3. Check browser console for frontend errors
4. Review `admin_actions` table for audit trail

---

## 🎯 Admin URLs Quick Reference

- **Login Page**: `/admin/login` ⭐ (Start here)
- Main Dashboard: `/admin`
- Mentor Verification: `/admin/mentor-verification`
- User Management: `/admin/user-management`
- Withdrawals: `/admin/withdrawals`
- Review Moderation: `/admin/review-moderation`

---

## 🔑 Quick Start Guide

### For First-Time Setup:

1. ✅ Run the migration SQL
2. ✅ Assign admin role to your user (SQL query above)
3. ✅ Navigate to `/admin/login`
4. ✅ Enter your email + password
5. ✅ Access granted! → Redirected to `/admin`

### Daily Use:

1. Go to `/admin/login`
2. Enter credentials
3. Manage platform
4. Click "Logout" when done

---

**Implementation Date:** February 27, 2026
**Status:** ✅ Production Ready with Secure Authentication
**Priority Level:** High Priority Complete
**Auth Method:** Email + Password with Role Verification
