# Priority DM Implementation Spec

## Objective
Implement a paid **Priority DM** feature where a user (student or mentor) can send one high-priority message to a mentor, receive one mentor reply, and enforce strict visibility and deletion behavior.

## Confirmed Product Decisions
1. Priority DM is a paid chat advice interaction.
2. Sender can be either a student or a mentor (requesting user).
3. Name of requesting user is always shared with mentor.
4. Contact information sharing is optional and selected by requester during booking.
5. Mentor queue shows only pending/unanswered Priority DMs.
6. After mentor replies, the ticket disappears from mentor inbox view.
7. Unanswered items remain visible to mentor until answered or mentor deletes.
8. Phase 1 is one-message one-reply only.
9. Student side keeps mentor reply until student reads it.
10. If unread, item remains available (no auto-expiry for unread in Phase 1).
11. After student reads, record is hard-deleted after 24 hours.
12. No strict reply SLA enforcement in Phase 1; notifications only.
13. Priority DM is the only supported messaging model in Phase 1.
14. No parallel regular messaging or session messaging flow will be maintained.

---

## Messaging Architecture Decision (Phase 1)
1. `priority_dm_threads` is the only source of truth for dashboard messaging.
2. Existing Messages tabs in mentor and student dashboards are repurposed to Priority DM inbox views.
3. Legacy booking-linked `session_messages` is not used for new messaging behavior.
4. There is no free-form regular DM in this phase.
5. Mentor can both send and receive Priority DMs through role-based querying of `priority_dm_threads`:
	1. Incoming: `mentor_id = auth.uid()`
	2. Sent: `requester_id = auth.uid()` and `requester_role = 'mentor'`
6. Student sees requester-side tickets where `requester_id = auth.uid()` and `requester_role = 'student'`.

---

## Scope (Phase 1)
Included:
1. Paid Priority DM creation flow.
2. Mentor pending queue and single reply action.
3. Student inbox visibility after reply.
4. Read-tracking and hard delete after read + 24h.
5. Optional contact sharing toggle at submission.
6. Reuse existing dashboard Messages tabs as Priority DM inbox UI.

Out of scope:
1. Multi-message conversation.
2. Refund automation.
3. SLA penalty automation.
4. Full moderation pipeline.
5. Regular direct messaging model.
6. Session-based chat model for this release.

---

## End-to-End Flow

### Flow A: Requester submits Priority DM
1. User selects Chat Advice Priority DM service.
2. User fills fields: name, email, message, phone (optional), contact-sharing toggle.
3. Payment is confirmed.
4. System creates Priority DM thread with status `submitted`.
5. Mentor receives dashboard and email notification.

### Flow B: Mentor handles pending item
1. Mentor opens Priority DM queue (only `submitted`).
2. Mentor views message and sender name.
3. If contact-sharing is enabled, contact info is shown; otherwise masked.
4. Mentor writes one reply and submits.
5. System updates ticket to `answered` and removes it from pending queue.

### Flow C: Requester reads mentor reply
1. Requester sees reply in Priority DM inbox as unread.
2. On opening reply, system marks as read and stores `read_at`.
3. System schedules hard deletion at `read_at + 24h`.
4. After 24h, data is hard-deleted from primary table.

---

## State Machine

States:
1. `submitted`
2. `answered`
3. `read_by_requester`
4. `deleted`

Transitions:
1. submit -> `submitted`
2. mentor_reply -> `answered`
3. requester_open_reply -> `read_by_requester`
4. cleanup_job_at_24h_after_read -> `deleted`

Rules:
1. Only one mentor reply is allowed in Phase 1.
2. Mentor cannot reply to non-submitted tickets.
3. Requester cannot send follow-up message in same ticket in Phase 1.

---

## Data Model

### Primary table: `priority_dm_threads`
Columns:
1. `id` UUID PK
2. `booking_id` UUID NULL (optional linkage to paid booking)
3. `requester_id` UUID NOT NULL
4. `requester_role` TEXT CHECK IN (`student`, `mentor`)
5. `mentor_id` UUID NOT NULL
6. `requester_name` TEXT NOT NULL
7. `requester_email` TEXT NOT NULL
8. `requester_phone` TEXT NULL
9. `share_contact_info` BOOLEAN NOT NULL DEFAULT false
10. `message_text` TEXT NOT NULL
11. `mentor_reply_text` TEXT NULL
12. `status` TEXT NOT NULL CHECK IN (`submitted`,`answered`,`read_by_requester`,`deleted`)
13. `submitted_at` TIMESTAMPTZ NOT NULL DEFAULT now()
14. `answered_at` TIMESTAMPTZ NULL
15. `read_at` TIMESTAMPTZ NULL
16. `delete_after` TIMESTAMPTZ NULL
17. `deleted_at` TIMESTAMPTZ NULL
18. `created_at` TIMESTAMPTZ NOT NULL DEFAULT now()
19. `updated_at` TIMESTAMPTZ NOT NULL DEFAULT now()

Indexes:
1. (`mentor_id`, `status`, `submitted_at DESC`)
2. (`requester_id`, `status`, `created_at DESC`)
3. (`delete_after`) WHERE `status = 'read_by_requester'`

### Optional audit table: `priority_dm_events`
Purpose: immutable transition logging.

Columns:
1. `id` UUID PK
2. `thread_id` UUID FK
3. `actor_id` UUID NULL
4. `event_type` TEXT
5. `metadata` JSONB
6. `created_at` TIMESTAMPTZ DEFAULT now()

---

## Visibility Rules

### Mentor view
1. Queue contains only `submitted` threads.
2. `answered` threads are hidden from pending queue.
3. Unanswered items stay until answered or mentor manually deletes.
4. Sender name always visible.
5. Contact info visible only when `share_contact_info = true`.

### Requester view
1. Before reply: shows pending status.
2. After reply: item visible as unread/answered.
3. After opening reply: visible with deletion countdown.
4. Hard delete at 24h after read.

---

## Authorization and RLS

Policies required:
1. Requester can `SELECT` own thread records.
2. Mentor can `SELECT` records assigned to them.
3. Requester can `INSERT` only with `requester_id = auth.uid()`.
4. Mentor can `UPDATE` assigned thread only for reply action when `status = submitted`.
5. Requester can `UPDATE` own thread only for read marker fields.
6. Hard delete job executes with service role only.

Recommended:
1. Enforce transitions through SQL functions to prevent illegal direct updates.

---

## Service/API Contract

Functions:
1. `create_priority_dm(p_mentor_id, p_message_text, p_share_contact_info, p_booking_id)`
2. `reply_priority_dm(p_thread_id, p_reply_text)`
3. `mark_priority_dm_read(p_thread_id)`
4. `list_mentor_priority_dm_pending()`
5. `list_requester_priority_dm()`
6. `delete_read_priority_dm_after_24h()`

Validation:
1. Paid entitlement required before create.
2. One-reply cap enforced.
3. Input sanitization and length limits enforced.

---

## UI Implementation

### Student or mentor requester UI
1. New chat booking step for Priority DM.
2. Fields: name, email, message, phone optional, contact-sharing toggle.
3. Submission success screen: pending state and expected response notification.

### Mentor dashboard UI
1. New/updated Priority DM pending widget/list.
2. Actions: open ticket, reply once, optional delete unanswered ticket.
3. Replied tickets disappear from pending list instantly.

### Requester inbox UI
1. Shows pending and answered tickets.
2. On opening answered ticket, mark read and show 24h deletion warning.

---

## Scheduled Jobs

Job: `priority_dm_read_cleanup`
1. Runs hourly.
2. Finds rows where `status = read_by_requester` and `delete_after <= now()`.
3. Hard deletes matching rows.

---

## Notifications

Phase 1 notification behavior:
1. On submit: notify mentor (dashboard + email).
2. On reply: notify requester (dashboard + email).
3. No strict SLA breach workflow in Phase 1.

---

## Edge Cases

1. Double mentor reply race -> lock by status check in transaction.
2. Requester opens reply near cleanup time -> mark read idempotently and compute delete_after once.
3. Unauthorized access attempts -> blocked by RLS and function checks.

---

## Rollout Plan

1. Add DB migration for `priority_dm_threads` and policies.
2. Add service functions (create, reply, read, cleanup).
3. Wire requester flow from chat option booking path.
4. Repurpose mentor Messages tab to Priority DM inbox (Incoming + Sent).
5. Repurpose student Messages tab to Priority DM inbox (Sent + Replies).
6. Disable legacy `session_messages` UI path from active dashboards.
7. Add cleanup scheduler.
8. Test with seeded paid bookings.
9. Release behind feature flag.

---

## Acceptance Criteria

1. Requester can send paid Priority DM with contact-sharing choice.
2. Mentor sees only unanswered Priority DMs.
3. Mentor can send exactly one reply.
4. After reply, ticket disappears from mentor pending queue.
5. Requester sees reply and unread status.
6. After requester reads, record is hard-deleted after 24 hours.
7. Unread answered items are retained indefinitely in Phase 1.
