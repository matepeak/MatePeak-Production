# Production Multi-User Testing Guide

## Quick Test Scenarios

### Scenario 1: Same Browser, Multiple Tabs (Same User)
**Purpose**: Verify session synchronization

1. Open app in Tab 1
2. Login as Student (student@test.com)
3. Open app in Tab 2 (same browser)
4. **Expected**: Auto-logged in as same user ✅
5. Make a booking in Tab 1
6. **Expected**: Tab 2 should show the booking (via realtime updates) ✅
7. Logout in Tab 2
8. **Expected**: Tab 1 should also logout ✅

**Pass Criteria**: Both tabs stay synchronized, no data duplication

---

### Scenario 2: Incognito Mode (Different User)
**Purpose**: Verify complete session isolation

1. **Regular Tab**: Login as Student (student@test.com)
2. **Incognito Tab**: Login as Mentor (mentor@test.com)
3. **Expected**: Each sees their own dashboard only ✅
4. Student books session with mentor
5. **Expected**: 
   - Student sees booking in their "My Sessions"
   - Mentor sees booking request in their dashboard
   - No data crossover ✅

**Pass Criteria**: Complete isolation, no data leakage

---

### Scenario 3: Different Browsers (Production Simulation)
**Purpose**: Simulate real production with concurrent users

1. **Chrome**: User A - Student
   - Browse mentors
   - Book a session
   - View dashboard

2. **Firefox**: User B - Mentor
   - View dashboard
   - Accept booking requests
   - Manage availability

3. **Edge**: User C - Student
   - Search mentors
   - Read reviews
   - Browse profiles

**Expected Results**:
- All work independently ✅
- No slow-downs or conflicts ✅
- Real-time updates work per user ✅
- Cache is independent per browser ✅

**Pass Criteria**: Concurrent operations without interference

---

### Scenario 4: Rapid User Switching
**Purpose**: Test cache invalidation on logout/login

1. Login as Student A
2. Browse mentors (cache populated)
3. Logout
4. **Immediately** login as Mentor B
5. **Expected**: See mentor dashboard, not student data ✅
6. Check: No student bookings visible ✅
7. Logout Mentor B
8. Login back as Student A
9. **Expected**: Student data loads fresh ✅

**Pass Criteria**: Clean cache on user change, no stale data

---

### Scenario 5: Network Interruption Recovery
**Purpose**: Verify reconnection handling

1. Login as Student
2. Open DevTools → Network tab
3. Go offline (throttle to offline)
4. Try to browse mentors
5. **Expected**: Error message or offline indicator ✅
6. Go back online
7. **Expected**: Auto-reconnect and data loads ✅
8. Session still valid ✅

**Pass Criteria**: Graceful offline handling, auto-recovery

---

## Performance Benchmarks

### Load Times (Target)
- Initial page load: < 3 seconds
- Dashboard load: < 2 seconds
- Mentor search: < 1 second
- Booking creation: < 2 seconds

### Concurrent Users
- 10 concurrent users: No degradation expected
- 50 concurrent users: Slight delay acceptable (< 500ms)
- 100+ concurrent users: May need scaling

### Memory Usage
- Single tab: < 100MB
- 5 tabs open: < 500MB total
- No memory leaks after 1 hour

---

## Debug Tools

### Check Current Session
```javascript
// In browser console
supabase.auth.getSession().then(({data}) => console.log(data.session))
```

### Check QueryClient Cache
```javascript
// In React DevTools
// Look for QueryClientProvider
// Inspect cache state
```

### Check LocalStorage
```javascript
// In browser console
console.log(localStorage.getItem('supabase.auth.token'))
```

### Monitor Realtime Connections
```javascript
// In browser console
supabase.getChannels() // See active subscriptions
```

---

## Common Issues & Solutions

### Issue: "User sees another user's data"
**Cause**: Old QueryClient singleton (FIXED)
**Solution**: Verify App.tsx uses useState for QueryClient
**Check**: `const [queryClient] = useState(...)`

### Issue: "Login in one tab logs out another"
**Cause**: Session storage conflict
**Solution**: Verify using localStorage (not sessionStorage)
**Check**: client.ts has `storage: localStorage`

### Issue: "Data doesn't update in real-time"
**Cause**: Realtime subscription not user-scoped
**Solution**: RLS policies filter by auth.uid()
**Check**: Database RLS policies enabled

### Issue: "Slow performance with multiple users"
**Cause**: Missing indexes or inefficient queries
**Solution**: Add database indexes on frequently queried columns
**Check**: Run EXPLAIN ANALYZE on slow queries

---

## Production Deployment Checklist

### Before Deployment
- [ ] QueryClient is per-instance (not singleton)
- [ ] Supabase client uses localStorage
- [ ] PKCE auth flow enabled
- [ ] RLS policies enabled on ALL tables
- [ ] Rate limiting configured
- [ ] Error boundaries in place
- [ ] Loading states for async operations

### After Deployment
- [ ] Test with 5+ concurrent users
- [ ] Monitor error logs for auth issues
- [ ] Check database connection pool
- [ ] Verify no CORS errors
- [ ] Test on mobile devices
- [ ] Test on slow networks (3G)

### Monitoring Metrics
- [ ] Active sessions count
- [ ] Authentication success/failure rate
- [ ] Query response times
- [ ] Cache hit/miss ratio
- [ ] Realtime connection stability
- [ ] Error rate by endpoint

---

## Emergency Rollback

If issues occur in production:

1. **Immediate**: Revert to previous version
2. **Check**: Error logs for specific failure
3. **Verify**: Database connections healthy
4. **Test**: In staging with exact production data
5. **Fix**: Apply targeted fix
6. **Deploy**: With gradual rollout

---

## Support Contacts

### Critical Issues
- Database down → Check Supabase status
- Auth failing → Verify env variables
- Cache issues → Clear QueryClient cache
- Realtime broken → Check RLS policies

### Health Check Endpoint
```bash
curl https://your-app.com/health
```

Should return:
```json
{
  "status": "healthy",
  "database": "connected",
  "auth": "active"
}
```

---

## Success Criteria

The multi-user fixes are successful when:

✅ Multiple users can use the app simultaneously
✅ No data leaks between users
✅ Sessions are properly isolated
✅ Cache works independently per user
✅ Real-time updates are user-specific
✅ No performance degradation with 10+ users
✅ Graceful error handling
✅ Session persistence across page reloads

---

## Automated Testing Script

```javascript
// Multi-user test suite
describe('Multi-User Scenarios', () => {
  test('Two users see different data', async () => {
    const session1 = await loginUser('student@test.com');
    const session2 = await loginUser('mentor@test.com');
    
    const data1 = await fetchDashboard(session1);
    const data2 = await fetchDashboard(session2);
    
    expect(data1).not.toEqual(data2);
    expect(data1.role).toBe('student');
    expect(data2.role).toBe('mentor');
  });
  
  test('QueryClient is isolated', () => {
    const app1 = mount(<App />);
    const app2 = mount(<App />);
    
    const client1 = app1.find('QueryClientProvider').prop('client');
    const client2 = app2.find('QueryClientProvider').prop('client');
    
    expect(client1).not.toBe(client2);
  });
});
```

---

## Final Notes

- **Database Level**: RLS policies are the PRIMARY security layer
- **Application Level**: QueryClient isolation prevents cache issues
- **Network Level**: HTTPS + PKCE provides secure auth flow
- **User Level**: LocalStorage ensures session persistence

All layers work together for a secure, scalable multi-user application.
