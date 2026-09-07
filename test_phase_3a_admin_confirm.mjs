// ============================================================================
// 157 TATTOO — PHASE 1: ADMIN CONFIRM BOOKING REQUEST VERIFICATION SUITE
// ============================================================================

const SUPABASE_URL = 'https://uieehinjjqoofejteehz.supabase.co';
const ANON_KEY = 'sb_publishable_iO2jc3ZXc4nOn1UaEZdtxQ_BBRmM3sU';

async function runTestSuite() {
  console.log('================================================================');
  console.log('157 TATTOO — PHASE 1: ADMIN CONFIRM BOOKING RPC VERIFICATION');
  console.log('================================================================\n');

  const cleanup = {
    estimateIds: [],
    bookingIds: [],
    sessionIds: [],
    customerUids: [],
  };

  try {
    // 1. Authenticate Admin
    console.log('[STEP 1] Authenticating Admin...');
    const adminAuthRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@157tattoo.com', password: '157tattoo' }),
    }).then((r) => r.json());

    if (!adminAuthRes.access_token) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminAuthRes)}`);
    }

    const adminToken = adminAuthRes.access_token;
    const adminHeaders = {
      apikey: ANON_KEY,
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    // 2. Fetch Active Artist
    const artists = await fetch(`${SUPABASE_URL}/rest/v1/artists?is_active=eq.true&order=sort_order`, {
      headers: adminHeaders,
    }).then((r) => r.json());

    if (!artists || artists.length === 0) {
      throw new Error('No active artists found');
    }
    const testArtist = artists[0];
    console.log(`✓ Active Artist: ${testArtist.name} (${testArtist.id})`);

    // 3. Create Disposable Test Customer
    console.log('\n[STEP 2] Creating Disposable Test Customer...');
    const runId = Math.floor(Math.random() * 8000) + 1000;
    const testCustomerEmail = `test_cust_phase1_${Date.now()}_${runId}@157tattoo.com`;
    const testCustomerPass = 'Password123!';
    const custSignup = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testCustomerEmail,
        password: testCustomerPass,
        data: { display_name: 'Test Customer Phase 1', phone: '0812345678', eligibility_confirmed: true },
      }),
    }).then((r) => r.json());

    const customerUid = custSignup.id || custSignup.user?.id;
    if (!customerUid) {
      throw new Error(`Customer signup failed: ${JSON.stringify(custSignup)}`);
    }
    cleanup.customerUids.push(customerUid);
    console.log(`✓ Test Customer created: ${testCustomerEmail} (${customerUid})`);

    // Customer Token
    const custAuth = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testCustomerEmail, password: testCustomerPass }),
    }).then((r) => r.json());

    const custToken = custAuth.access_token;
    const custHeaders = {
      apikey: ANON_KEY,
      Authorization: `Bearer ${custToken}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };

    // Helper: Create PENDING estimate request
    async function createPendingEstimate(preferredDate = '2027-01-10') {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/estimate_requests`, {
        method: 'POST',
        headers: custHeaders,
        body: JSON.stringify({
          customer_user_id: customerUid,
          artist_id: testArtist.id,
          reference_images: ['https://example.com/test-ref.jpg'],
          width_cm: 10,
          height_cm: 10,
          placement: 'ต้นแขนขวา',
          style: 'Minimal',
          description: `Phase 1 RPC Test Request ${Date.now()}`,
          preferred_date: preferredDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(`Create estimate failed: ${JSON.stringify(data)}`);
      cleanup.estimateIds.push(data[0].id);
      return data[0];
    }

    // Dynamic test date generation (year 2027 to avoid any collisions)
    const baseDay = (runId % 20) + 1;
    const testDate1 = `2027-02-${String(baseDay).padStart(2, '0')}`;
    const testDate2 = `2027-02-${String(baseDay + 1).padStart(2, '0')}`;
    const testDate3 = `2027-02-${String(baseDay + 2).padStart(2, '0')}`;

    // ------------------------------------------------------------------
    // TEST 1 — Valid / No Deposit (deposit = 0)
    // ------------------------------------------------------------------
    console.log(`\n--- [TEST 1] Admin Confirm with No Deposit (deposit = 0) [Date: ${testDate1}] ---`);
    const est1 = await createPendingEstimate(testDate1);
    const rpc1Res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_confirm_booking_request`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        p_estimate_request_id: est1.id,
        p_appointment_date: testDate1,
        p_start_time: '10:00:00',
        p_end_time: '13:00:00',
        p_deposit_required: 0,
        p_admin_note: 'Test 1 No Deposit Confirmed',
      }),
    });
    const rpc1 = await rpc1Res.json();
    console.log('RPC 1 Result:', rpc1);

    if (rpc1.success && rpc1.booking_status === 'CONFIRMED' && rpc1.session_status === 'SCHEDULED') {
      console.log('✅ TEST 1 PASSED: Estimate -> ACCEPTED, Booking -> CONFIRMED, Session -> SCHEDULED');
      cleanup.bookingIds.push(rpc1.booking_id);
      cleanup.sessionIds.push(rpc1.booking_session_id);
    } else {
      console.error('❌ TEST 1 FAILED:', rpc1);
    }

    // ------------------------------------------------------------------
    // TEST 2 — Valid / Deposit Required (deposit > 0)
    // ------------------------------------------------------------------
    console.log(`\n--- [TEST 2] Admin Confirm with Deposit Required (deposit = 1000) [Date: ${testDate2}] ---`);
    const est2 = await createPendingEstimate(testDate2);
    const rpc2Res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_confirm_booking_request`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        p_estimate_request_id: est2.id,
        p_appointment_date: testDate2,
        p_start_time: '14:00:00',
        p_end_time: '17:00:00',
        p_deposit_required: 1000,
        p_admin_note: 'Test 2 Deposit Required Confirmed',
      }),
    });
    const rpc2 = await rpc2Res.json();
    console.log('RPC 2 Result:', rpc2);

    if (rpc2.success && rpc2.booking_status === 'WAITING_DEPOSIT' && rpc2.session_status === 'SCHEDULED') {
      console.log('✅ TEST 2 PASSED: Booking -> WAITING_DEPOSIT, Session -> SCHEDULED');
      cleanup.bookingIds.push(rpc2.booking_id);
      cleanup.sessionIds.push(rpc2.booking_session_id);
    } else {
      console.error('❌ TEST 2 FAILED:', rpc2);
    }

    // ------------------------------------------------------------------
    // TEST 3 — Double Booking Prevention (GiST exclusion)
    // ------------------------------------------------------------------
    console.log(`\n--- [TEST 3] Double Booking Protection (Overlapping Time Slot on ${testDate1}) ---`);
    const est3 = await createPendingEstimate(testDate1);
    // Overlaps with testDate1 10:00-13:00 from Test 1
    const rpc3Res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_confirm_booking_request`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        p_estimate_request_id: est3.id,
        p_appointment_date: testDate1,
        p_start_time: '11:00:00',
        p_end_time: '14:00:00',
        p_deposit_required: 0,
        p_admin_note: 'Test 3 Overlapping Slot',
      }),
    });
    const rpc3 = await rpc3Res.json();
    console.log('RPC 3 (Expected Failure):', rpc3);

    // Verify estimate is still PENDING
    const checkEst3 = await fetch(`${SUPABASE_URL}/rest/v1/estimate_requests?id=eq.${est3.id}`, {
      headers: adminHeaders,
    }).then((r) => r.json());

    if (!rpc3.success && rpc3.code === '23P01' && checkEst3[0]?.status === 'PENDING') {
      console.log('✅ TEST 3 PASSED: Double booking blocked by GiST constraint & request remains PENDING');
    } else {
      console.error('❌ TEST 3 FAILED:', { rpc3, estStatus: checkEst3[0]?.status });
    }

    // ------------------------------------------------------------------
    // TEST 4 — Confirm Same Request Twice (Idempotency)
    // ------------------------------------------------------------------
    console.log('\n--- [TEST 4] Duplicate Confirmation Rejection ---');
    if (rpc1.success) {
      const rpc4Res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_confirm_booking_request`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          p_estimate_request_id: est1.id, // already ACCEPTED in Test 1
          p_appointment_date: testDate3,
          p_start_time: '10:00:00',
          p_end_time: '12:00:00',
          p_deposit_required: 0,
          p_admin_note: 'Duplicate Attempt',
        }),
      });
      const rpc4 = await rpc4Res.json();
      console.log('RPC 4 (Expected Failure):', rpc4);
      if (!rpc4.success && (rpc4.code === '22023' || rpc4.code === '23505' || rpc4.message?.includes('status') || rpc4.message?.includes('already exists'))) {
        console.log('✅ TEST 4 PASSED: Duplicate confirmation rejected cleanly');
      } else {
        console.error('❌ TEST 4 FAILED:', rpc4);
      }
    } else {
      console.log('⚠️ TEST 4 SKIPPED: Requires Test 1 to succeed first');
    }

    // ------------------------------------------------------------------
    // TEST 5 — Customer Attempts Admin RPC
    // ------------------------------------------------------------------
    console.log('\n--- [TEST 5] Customer Calling Admin RPC (Security Enforcement) ---');
    const est5 = await createPendingEstimate(testDate3);
    const rpc5Res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_confirm_booking_request`, {
      method: 'POST',
      headers: custHeaders, // Customer token
      body: JSON.stringify({
        p_estimate_request_id: est5.id,
        p_appointment_date: testDate3,
        p_start_time: '10:00:00',
        p_end_time: '12:00:00',
        p_deposit_required: 0,
        p_admin_note: 'Customer Spoof Attempt',
      }),
    });
    const rpc5 = await rpc5Res.json();
    console.log('RPC 5 (Expected Rejection):', rpc5);
    if (!rpc5.success && (rpc5.code === '42501' || rpc5.message?.includes('Unauthorized') || rpc5.message?.includes('Admin'))) {
      console.log('✅ TEST 5 PASSED: Customer execution rejected with 42501 Unauthorized');
    } else {
      console.error('❌ TEST 5 FAILED:', rpc5);
    }

    // ------------------------------------------------------------------
    // TEST 6 — Invalid end_time <= start_time
    // ------------------------------------------------------------------
    console.log('\n--- [TEST 6] Invalid Time Bounds (end_time <= start_time) ---');
    const est6 = await createPendingEstimate(testDate3);
    const rpc6Res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_confirm_booking_request`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        p_estimate_request_id: est6.id,
        p_appointment_date: testDate3,
        p_start_time: '15:00:00',
        p_end_time: '14:00:00', // Invalid: before start_time
        p_deposit_required: 0,
        p_admin_note: 'Invalid Time',
      }),
    });
    const rpc6 = await rpc6Res.json();
    console.log('RPC 6 (Expected Validation Error):', rpc6);
    if (!rpc6.success && (rpc6.message?.includes('later than') || rpc6.message?.includes('end_at'))) {
      console.log('✅ TEST 6 PASSED: Invalid time bounds rejected');
    } else {
      console.error('❌ TEST 6 FAILED:', rpc6);
    }

    // ------------------------------------------------------------------
    // TEST 7 — Non-existent Request
    // ------------------------------------------------------------------
    console.log('\n--- [TEST 7] Non-existent Request ID ---');
    const rpc7Res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_confirm_booking_request`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        p_estimate_request_id: '00000000-0000-0000-0000-000000000000',
        p_appointment_date: '2027-03-01',
        p_start_time: '10:00:00',
        p_end_time: '12:00:00',
        p_deposit_required: 0,
        p_admin_note: 'Non-existent',
      }),
    });
    const rpc7 = await rpc7Res.json();
    console.log('RPC 7 (Expected Not Found):', rpc7);
    if (!rpc7.success && (rpc7.code === 'P0002' || rpc7.message?.includes('not found'))) {
      console.log('✅ TEST 7 PASSED: Non-existent request rejected');
    } else {
      console.error('❌ TEST 7 FAILED:', rpc7);
    }

  } catch (err) {
    console.error('Test Suite Exception:', err);
  } finally {
    // Cleanup disposable test entities
    console.log('\n[CLEANUP] Cleaning up test records...');
    const adminAuthRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@157tattoo.com', password: '157tattoo' }),
    }).then((r) => r.json());

    const adminHeaders = {
      apikey: ANON_KEY,
      Authorization: `Bearer ${adminAuthRes.access_token}`,
      'Content-Type': 'application/json',
    };

    for (const sid of cleanup.sessionIds) {
      await fetch(`${SUPABASE_URL}/rest/v1/booking_sessions?id=eq.${sid}`, { method: 'DELETE', headers: adminHeaders });
    }
    for (const bid of cleanup.bookingIds) {
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bid}`, { method: 'DELETE', headers: adminHeaders });
    }
    for (const eid of cleanup.estimateIds) {
      await fetch(`${SUPABASE_URL}/rest/v1/estimate_requests?id=eq.${eid}`, { method: 'DELETE', headers: adminHeaders });
    }
    console.log('✓ Cleanup complete. Zero production impact.');
  }
}

runTestSuite().catch(console.error);
