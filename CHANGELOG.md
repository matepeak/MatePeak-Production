# Changelog

All notable changes to MatePeak will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- Payment gateway integration (Razorpay/Stripe)
- Video calling integration
- Email notification system
- SMS reminder system
- Mobile applications (iOS/Android)

## [2.0.0] - 2025-10-28

### Added - Phase 2 Major Features

#### Reviews & Ratings Management
- Centralized reviews dashboard for mentors
- Reply to student reviews functionality
- Filter reviews by rating (1-5 stars)
- Export reviews to CSV
- Visual rating distribution charts

#### Advanced Availability Calendar
- Visual monthly calendar interface
- Recurring weekly patterns ("Every Monday 9-10am")
- Specific date slots for one-time availability
- Block dates feature for vacations
- Color-coded availability indicators (green/red)

#### Session Calendar View
- Monthly calendar grid showing all sessions
- Color-coded session status (pending/confirmed/completed/cancelled)
- Export sessions to ICS (Google Calendar compatible)
- Click session for details modal
- Session statistics summary cards

#### Session-Based Messaging
- Real-time chat via Supabase subscriptions
- Two-panel layout (conversations list + chat window)
- Message templates (confirmation, reminder, follow-up)
- Unread message badges with counts
- Search conversations by student name

#### Student Directory & CRM
- Aggregated view of all students per mentor
- Student statistics (total sessions, total paid, last session)
- Private notes system (visible only to mentor)
- Search students by name or email
- Student engagement tracking

#### Earnings Placeholder
- "Coming Soon" card with gradient design
- Placeholder for future payment integration

### Changed
- Enhanced mentor dashboard with tabbed navigation
- Improved UI/UX across all dashboard pages
- Optimized database queries for better performance

### Technical
- Added new database tables: `session_messages`, `student_notes`, `mentor_reviews`
- Implemented RLS policies for new features
- Added database indexes for performance
- Set up Supabase real-time subscriptions
- Updated TypeScript types and interfaces

## [1.0.0] - 2025-09-15

### Added - Phase 1 MVP Features

#### Authentication & Authorization
- User registration with email/password
- User login and session management
- Role-based access control (Student, Mentor, Admin)
- Row Level Security (RLS) policies

#### Mentor Management
- Mentor profile creation and editing
- Multi-expertise selection
- Hourly rate configuration
- Bio and experience sections
- Profile picture upload
- Teaching certifications

#### Student Features
- Browse mentor listings
- Advanced search with 15+ filters
- Filter by expertise, price, rating, experience
- View mentor profiles
- Book mentorship sessions (30/60/90 minutes)
- Session history and tracking
- Leave reviews and ratings

#### Booking System
- Real-time availability checking
- Multiple session duration options
- Booking request workflow
- Session approval/rejection by mentors
- Booking history for students and mentors

#### Review System
- 5-star rating system
- Written review submission
- Display reviews on mentor profiles
- Average rating calculation
- Review moderation

#### Admin Dashboard
- Platform analytics and metrics
- User management
- Mentor verification and approval
- System monitoring

#### Wallet & Payments (Foundation)
- Wallet system for mentors
- Earnings tracking
- 90/10 revenue split (90% to mentors)
- Withdrawal request system
- Transaction history

### Technical
- React 18 with TypeScript
- Vite build system
- Tailwind CSS for styling
- shadcn/ui component library
- Supabase backend (PostgreSQL, Auth, Storage)
- Row Level Security implementation
- Database migrations setup
- ESLint and Prettier configuration
- Responsive design (mobile, tablet, desktop)

## [0.1.0] - 2025-08-01

### Added
- Initial project setup
- Basic folder structure
- Supabase configuration
- Authentication scaffolding
- Basic UI components

---

## Version History Summary

| Version | Release Date | Major Changes |
|---------|-------------|---------------|
| 2.0.0   | 2025-10-28  | Phase 2: Advanced features (calendar, messaging, CRM) |
| 1.0.0   | 2025-09-15  | Phase 1: MVP launch |
| 0.1.0   | 2025-08-01  | Initial setup |

---

## Upgrade Notes

### From 1.0.0 to 2.0.0

**Database Migration Required:**
1. Run the Phase 2 migration script: `supabase/migrations/20251028_phase2_complete_migration.sql`
2. Verify all new tables are created
3. Check RLS policies are applied
4. Test real-time subscriptions

**Breaking Changes:**
- None (backward compatible)

**New Dependencies:**
- No new npm dependencies required
- Supabase real-time features must be enabled

**Configuration Changes:**
- Add `VITE_ENABLE_REALTIME=true` to `.env` for real-time features

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to contribute to this project.

---

## Links

- [Repository](https://github.com/iteshprajapati/MatePeak)
- [Live Demo](https://lovable.dev/projects/a38ee718-2896-40dd-b995-43875d096ec9)
- [Documentation](./docs/INDEX.md)
- [Issue Tracker](https://github.com/iteshprajapati/MatePeak/issues)

---

[Unreleased]: https://github.com/iteshprajapati/MatePeak/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/iteshprajapati/MatePeak/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/iteshprajapati/MatePeak/compare/v0.1.0...v1.0.0
[0.1.0]: https://github.com/iteshprajapati/MatePeak/releases/tag/v0.1.0
