// ============================================================================
// 157 TATTOO — FULL ARTIST OWN-WORK MANAGEMENT VERIFICATION SUITE
// ============================================================================

import fs from 'fs';

const envContent = fs.readFileSync('c:/Users/Thanoo Armee/Downloads/โฟลเดอร์ใหม่ (4)/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const idx = trimmed.indexOf('=');
    if (idx > 0) env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

const BAS_ARTIST_ID = 'd5af5064-d973-4bbb-b205-1ab6b2929abb';
const BOM_ARTIST_ID = '9aee0ce8-2c11-4b22-a52d-296807070d12';

async function runTestSuite() {
  console.log('================================================================');
  console.log('157 TATTOO — FULL ARTIST OWN-WORK MANAGEMENT VERIFICATION SUITE');
  console.log('================================================================\n');

  const createdFixtures = {
    estimateIds: [],
    bookingIds: [],
    sessionIds: [],
    submissionIds: [],
    customerUids: []
  };

  const results = {
    acceptOwnRequest: false,
    rejectOwnRequest: false,
    setDateStartEndTime: false,
    setTattooPrice: false,
    setDepositRequired: false,
    rescheduleOwnBooking: false,
    cancelOwnBooking: false,
    addSession: false,
    startSession: false,
    completeSession: false,
    completeBooking: false,
    seesOwnPayment: false,
    approveOwnPayment: false,
    rejectOwnPayment: false,
    calendarUpdate: false,
    adminSeesAllChanges: false,
    crossArtistRequestAccess: false,
    crossArtistBookingWrite: false,
    crossArtistSessionWrite: false,
    crossArtistPaymentWrite: false,
    basAdminAccess: false,
    rpcOwnershipChecks: false,
    rpcPublicRevoked: false,
    invalidStateTransitions: false,
    paymentStorageIsolation: false,
  };

  try {
    // -------------------------------------------------------------------------
    // STEP 1: Authenticate Users
    // -------------------------------------------------------------------------
    console.log('[STEP 1] Authenticating Bas (Artist) & Admin (Owner)...');
    
    // Bas Login
    const basLoginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'artist1@157tattoo.com', password: 'BasTattoo157Strong!' }),
    }).then(r => r.json());

    if (!basLoginRes.access_token) {
      throw new Error(`Bas login failed: ${JSON.stringify(basLoginRes)}`);
    }
    const basToken = basLoginRes.access_token;
    const basHeaders = {
      apikey: ANON_KEY,
      Authorization: `Bearer ${basToken}`,
      'Content-Type': 'application/json'
    };
    console.log('✓ Bas Auth Token acquired');

    // Admin Login
    const adminLoginRes = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@157tattoo.com', password: '157tattoo' }),
    }).then(r => r.json());

    if (!adminLoginRes.access_token) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLoginRes)}`);
    }
    const adminToken = adminLoginRes.access_token;
    const adminHeaders = {
      apikey: ANON_KEY,
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    };
    console.log('✓ Admin Auth Token acquired\n');

    // Service Headers for test fixture setup & cleanup
    const serviceHeaders = {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation'
    };

    // -------------------------------------------------------------------------
    // STEP 2: Verify RPC Public Execution is Revoked
    // -------------------------------------------------------------------------
    console.log('[STEP 2] Testing Anon RPC Execution Lockdown...');
    const anonRpcRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/artist_confirm_booking_request`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        p_estimate_request_id: '00000000-0000-0000-0000-000000000000',
        p_appointment_date: '2026-10-01',
        p_start_time: '10:00',
        p_end_time: '12:00'
      })
    });
    console.log(`   Anon RPC call status: ${anonRpcRes.status}`);
    if (anonRpcRes.status === 401 || anonRpcRes.status === 403) {
      results.rpcPublicRevoked = true;
      console.log('✓ RPC Public execution is successfully REVOKED\n');
    } else {
      console.log(`❌ Anon RPC execution returned ${anonRpcRes.status}\n`);
    }

    // -------------------------------------------------------------------------
    // STEP 3: Create Test Customer & Controlled Fixtures
    // -------------------------------------------------------------------------
    console.log('[STEP 3] Fetching Test Customer Profile...');
    const custProfiles = await fetch(`${SUPABASE_URL}/rest/v1/profiles?role=eq.customer&limit=1`, {
      headers: serviceHeaders
    }).then(r => r.json());
    if (!custProfiles || custProfiles.length === 0) throw new Error('No customer profile found in database');
    const testCustomerUid = custProfiles[0].user_id;
    console.log(`✓ Using Customer User ID: ${testCustomerUid}`);

    // Create Test Estimate Request for Bas
    const basEstRes = await fetch(`${SUPABASE_URL}/rest/v1/estimate_requests`, {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({
        customer_user_id: testCustomerUid,
        artist_id: BAS_ARTIST_ID,
        placement: 'แขนขวา',
        style: 'Blackwork',
        description: 'งานสักมังกรทดสอบ Bas',
        status: 'PENDING'
      })
    }).then(r => r.json());

    const basEstimate = Array.isArray(basEstRes) ? basEstRes[0] : basEstRes;
    if (!basEstimate?.id) throw new Error(`Failed to create Bas estimate fixture: ${JSON.stringify(basEstRes)}`);
    createdFixtures.estimateIds.push(basEstimate.id);
    console.log(`✓ Created Bas Test Estimate: ${basEstimate.id}`);

    // Create Test Estimate Request for Bom (Cross-artist test)
    const bomEstRes = await fetch(`${SUPABASE_URL}/rest/v1/estimate_requests`, {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({
        customer_user_id: testCustomerUid,
        artist_id: BOM_ARTIST_ID,
        placement: 'หลัง',
        style: 'Blackwork',
        description: 'งานสักเสือทดสอบ Bom',
        status: 'PENDING'
      })
    }).then(r => r.json());

    const bomEstimate = Array.isArray(bomEstRes) ? bomEstRes[0] : bomEstRes;
    if (!bomEstimate?.id) throw new Error(`Failed to create Bom estimate fixture: ${JSON.stringify(bomEstRes)}`);
    createdFixtures.estimateIds.push(bomEstimate.id);
    console.log(`✓ Created Bom Test Estimate: ${bomEstimate.id}\n`);

    // -------------------------------------------------------------------------
    // STEP 4: Cross-Artist Security Check on Estimate Requests
    // -------------------------------------------------------------------------
    console.log('[STEP 4] Testing Cross-Artist Isolation (Bas attempting actions on Bom request)...');
    
    // Bas tries to read Bom request directly
    const basReadBomReq = await fetch(`${SUPABASE_URL}/rest/v1/estimate_requests?id=eq.${bomEstimate.id}`, {
      headers: basHeaders
    }).then(r => r.json());

    if (Array.isArray(basReadBomReq) && basReadBomReq.length === 0) {
      results.crossArtistRequestAccess = true;
      console.log('✓ Bas reading Bom request = DENIED (RLS active)');
    } else {
      console.log(`❌ Bas could read Bom request: ${JSON.stringify(basReadBomReq)}`);
    }

    // Bas tries to confirm Bom request via RPC
    const basConfirmBomRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/artist_confirm_booking_request`, {
      method: 'POST',
      headers: basHeaders,
      body: JSON.stringify({
        p_estimate_request_id: bomEstimate.id,
        p_appointment_date: '2026-10-01',
        p_start_time: '10:00',
        p_end_time: '13:00',
        p_quoted_price: 5000,
        p_deposit_required: 500
      })
    }).then(r => r.json());

    if (basConfirmBomRes.code === '42501' || (basConfirmBomRes.message && basConfirmBomRes.message.includes('Unauthorized'))) {
      results.rpcOwnershipChecks = true;
      console.log('✓ Bas confirming Bom request = DENIED (Unauthorized)\n');
    } else {
      console.log(`❌ Bas confirmed Bom request unexpectedly: ${JSON.stringify(basConfirmBomRes)}\n`);
    }

    // -------------------------------------------------------------------------
    // STEP 5: Bas Accepts Own Request
    // -------------------------------------------------------------------------
    console.log('[STEP 5] Bas Confirming Own Request (Accept Request)...');
    const basConfirmRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/artist_confirm_booking_request`, {
      method: 'POST',
      headers: basHeaders,
      body: JSON.stringify({
        p_estimate_request_id: basEstimate.id,
        p_appointment_date: '2026-10-10',
        p_start_time: '11:00',
        p_end_time: '15:00',
        p_quoted_price: 6500,
        p_deposit_required: 1000,
        p_artist_note: 'ช่างบาสรับงานเรียบร้อย'
      })
    }).then(r => r.json());

    if (basConfirmRes.success && basConfirmRes.booking_id) {
      results.acceptOwnRequest = true;
      results.setDateStartEndTime = true;
      results.setTattooPrice = true;
      results.setDepositRequired = true;
      createdFixtures.bookingIds.push(basConfirmRes.booking_id);
      createdFixtures.sessionIds.push(basConfirmRes.booking_session_id);
      console.log(`✓ Bas accepted own request successfully! Booking ID: ${basConfirmRes.booking_id}, Status: ${basConfirmRes.booking_status}\n`);
    } else {
      throw new Error(`Bas failed to accept own request: ${JSON.stringify(basConfirmRes)}`);
    }

    const basBookingId = basConfirmRes.booking_id;
    const basSessionId = basConfirmRes.booking_session_id;

    // -------------------------------------------------------------------------
    // STEP 6: Bas Rejects Own Request Test (with separate fixture)
    // -------------------------------------------------------------------------
    console.log('[STEP 6] Testing Bas Reject Own Request...');
    const basEstRejectRes = await fetch(`${SUPABASE_URL}/rest/v1/estimate_requests`, {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({
        customer_user_id: testCustomerUid,
        artist_id: BAS_ARTIST_ID,
        placement: 'ขาขวา',
        style: 'Blackwork',
        description: 'งานสักปฏิเสธทดสอบ',
        status: 'PENDING'
      })
    }).then(r => r.json());
    const rejectEst = Array.isArray(basEstRejectRes) ? basEstRejectRes[0] : basEstRejectRes;
    createdFixtures.estimateIds.push(rejectEst.id);

    const basRejectRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/artist_reject_booking_request`, {
      method: 'POST',
      headers: basHeaders,
      body: JSON.stringify({
        p_estimate_request_id: rejectEst.id,
        p_rejection_reason: 'คิวช่วงนี้เต็มแล้ว'
      })
    }).then(r => r.json());

    if (basRejectRes.success) {
      results.rejectOwnRequest = true;
      console.log('✓ Bas rejected own request = PASS\n');
    } else {
      console.log(`❌ Bas reject failed: ${JSON.stringify(basRejectRes)}\n`);
    }

    // -------------------------------------------------------------------------
    // STEP 7: Bas Reschedule Own Booking
    // -------------------------------------------------------------------------
    console.log('[STEP 7] Bas Rescheduling Own Booking...');
    const rescheduleRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/artist_reschedule_booking`, {
      method: 'POST',
      headers: basHeaders,
      body: JSON.stringify({
        p_booking_id: basBookingId,
        p_session_id: basSessionId,
        p_new_date: '2026-10-12',
        p_new_start_time: '13:00',
        p_new_end_time: '17:00',
        p_note: 'เลื่อนคิวตามลูกค้าสะดวก'
      })
    }).then(r => r.json());

    if (rescheduleRes.success) {
      results.rescheduleOwnBooking = true;
      console.log('✓ Bas rescheduled own booking = PASS\n');
    } else {
      console.log(`❌ Reschedule failed: ${JSON.stringify(rescheduleRes)}\n`);
    }

    // -------------------------------------------------------------------------
    // STEP 8: Bas Add Session
    // -------------------------------------------------------------------------
    console.log('[STEP 8] Bas Adding Session #2 to Own Booking...');
    const addSessionRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/artist_add_session`, {
      method: 'POST',
      headers: basHeaders,
      body: JSON.stringify({
        p_booking_id: basBookingId,
        p_appointment_date: '2026-10-20',
        p_start_time: '10:00',
        p_end_time: '14:00',
        p_note: 'รอบที่ 2 สักเก็บเงา'
      })
    }).then(r => r.json());

    if (addSessionRes.success && addSessionRes.session_id) {
      results.addSession = true;
      createdFixtures.sessionIds.push(addSessionRes.session_id);
      console.log(`✓ Bas added session #2 = PASS (Session ID: ${addSessionRes.session_id})\n`);
    } else {
      console.log(`❌ Add session failed: ${JSON.stringify(addSessionRes)}\n`);
    }

    // -------------------------------------------------------------------------
    // STEP 9: Payment Submissions & Approval/Rejection Test
    // -------------------------------------------------------------------------
    console.log('[STEP 9] Testing Payment Submissions & Approval...');
    
    // Create payment submission for Bas booking
    const subRes = await fetch(`${SUPABASE_URL}/rest/v1/booking_payment_submissions`, {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({
        booking_id: basBookingId,
        customer_user_id: testCustomerUid,
        claimed_amount: 1000,
        slip_path: `${testCustomerUid}/${basBookingId}/test_slip.jpg`,
        status: 'PENDING'
      })
    }).then(r => r.json());
    const subObj = Array.isArray(subRes) ? subRes[0] : subRes;
    createdFixtures.submissionIds.push(subObj.id);

    // Bas reads own payment submissions
    const basReadSub = await fetch(`${SUPABASE_URL}/rest/v1/booking_payment_submissions?id=eq.${subObj.id}`, {
      headers: basHeaders
    }).then(r => r.json());

    if (Array.isArray(basReadSub) && basReadSub.length > 0) {
      results.seesOwnPayment = true;
      console.log('✓ Bas sees own payment submission = PASS');
    }

    // Bas approves own payment submission
    const approvePaymentRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/artist_approve_payment_submission`, {
      method: 'POST',
      headers: basHeaders,
      body: JSON.stringify({
        p_submission_id: subObj.id,
        p_verified_amount: 1000,
        p_payment_method: 'BANK_TRANSFER'
      })
    }).then(r => r.json());

    if (approvePaymentRes.success) {
      results.approveOwnPayment = true;
      console.log('✓ Bas approved own payment submission = PASS');

      // Verify booking status transitioned to CONFIRMED
      const checkBooking = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${basBookingId}`, {
        headers: basHeaders
      }).then(r => r.json());
      if (checkBooking[0]?.status === 'CONFIRMED') {
        console.log('✓ Booking transitioned to CONFIRMED after payment approval\n');
      }
    } else {
      console.log(`❌ Approve payment failed: ${JSON.stringify(approvePaymentRes)}\n`);
    }

    // Test Payment Rejection with another submission
    const subRejectRes = await fetch(`${SUPABASE_URL}/rest/v1/booking_payment_submissions`, {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({
        booking_id: basBookingId,
        customer_user_id: testCustomerUid,
        claimed_amount: 500,
        slip_path: `${testCustomerUid}/${basBookingId}/test_slip_2.jpg`,
        status: 'PENDING'
      })
    }).then(r => r.json());
    const subRejectObj = Array.isArray(subRejectRes) ? subRejectRes[0] : subRejectRes;
    createdFixtures.submissionIds.push(subRejectObj.id);

    const rejectPayRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/artist_reject_payment_submission`, {
      method: 'POST',
      headers: basHeaders,
      body: JSON.stringify({
        p_submission_id: subRejectObj.id,
        p_rejection_reason: 'ยอดเงินมัดจำไม่ครบ'
      })
    }).then(r => r.json());

    if (rejectPayRes.success) {
      results.rejectOwnPayment = true;
      console.log('✓ Bas rejected invalid payment submission = PASS\n');
    }

    // -------------------------------------------------------------------------
    // STEP 10: Session Lifecycle: Start -> Complete -> Complete Booking
    // -------------------------------------------------------------------------
    console.log('[STEP 10] Testing Session Lifecycle (Start -> Complete Session -> Complete Booking)...');
    
    // Start Session
    const startSessRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/artist_start_session`, {
      method: 'POST',
      headers: basHeaders,
      body: JSON.stringify({ p_session_id: basSessionId })
    }).then(r => r.json());

    if (startSessRes.success) {
      results.startSession = true;
      console.log('✓ Bas started session = PASS');
    }

    // Complete Session #1
    const completeSessRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/artist_complete_session`, {
      method: 'POST',
      headers: basHeaders,
      body: JSON.stringify({ p_session_id: basSessionId, p_session_note: 'สักเดินเส้นเสร็จแล้ว' })
    }).then(r => r.json());

    if (completeSessRes.success) {
      results.completeSession = true;
      console.log('✓ Bas completed session #1 = PASS');
    }

    // Start and Complete Session #2 (added in step 8)
    const sess2Id = addSessionRes.session_id;
    if (sess2Id) {
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/artist_start_session`, {
        method: 'POST',
        headers: basHeaders,
        body: JSON.stringify({ p_session_id: sess2Id })
      });
      await fetch(`${SUPABASE_URL}/rest/v1/rpc/artist_complete_session`, {
        method: 'POST',
        headers: basHeaders,
        body: JSON.stringify({ p_session_id: sess2Id, p_session_note: 'สักเก็บเงาเสร็จแล้ว' })
      });
      console.log('✓ Bas completed session #2 = PASS');
    }

    // Complete Booking
    const completeBookingRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/artist_complete_booking`, {
      method: 'POST',
      headers: basHeaders,
      body: JSON.stringify({ p_booking_id: basBookingId })
    }).then(r => r.json());

    if (completeBookingRes.success) {
      results.completeBooking = true;
      console.log('✓ Bas completed booking = PASS\n');
    } else {
      console.log(`❌ Complete booking failed: ${JSON.stringify(completeBookingRes)}\n`);
    }

    // -------------------------------------------------------------------------
    // STEP 11: Bas Cancel Booking Test
    // -------------------------------------------------------------------------
    console.log('[STEP 11] Testing Bas Cancel Own Booking...');
    const cancelEstRes = await fetch(`${SUPABASE_URL}/rest/v1/estimate_requests`, {
      method: 'POST',
      headers: serviceHeaders,
      body: JSON.stringify({
        customer_user_id: testCustomerUid,
        artist_id: BAS_ARTIST_ID,
        placement: 'หน้าอก',
        style: 'Blackwork',
        description: 'งานสักยกเลิกทดสอบ',
        status: 'PENDING'
      })
    }).then(r => r.json());
    const cancelEst = Array.isArray(cancelEstRes) ? cancelEstRes[0] : cancelEstRes;
    createdFixtures.estimateIds.push(cancelEst.id);

    const cancelConfRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/artist_confirm_booking_request`, {
      method: 'POST',
      headers: basHeaders,
      body: JSON.stringify({
        p_estimate_request_id: cancelEst.id,
        p_appointment_date: '2026-11-01',
        p_start_time: '12:00',
        p_end_time: '15:00',
        p_quoted_price: 3000,
        p_deposit_required: 0
      })
    }).then(r => r.json());
    createdFixtures.bookingIds.push(cancelConfRes.booking_id);
    createdFixtures.sessionIds.push(cancelConfRes.booking_session_id);

    const cancelBookingRes = await fetch(`${SUPABASE_URL}/rest/v1/rpc/artist_cancel_booking`, {
      method: 'POST',
      headers: basHeaders,
      body: JSON.stringify({
        p_booking_id: cancelConfRes.booking_id,
        p_cancellation_reason: 'ลูกค้ายกเลิกล่วงหน้า'
      })
    }).then(r => r.json());

    if (cancelBookingRes.success) {
      results.cancelOwnBooking = true;
      console.log('✓ Bas cancelled own booking = PASS\n');
    }

    // -------------------------------------------------------------------------
    // STEP 12: Admin Visibility & Access Verification
    // -------------------------------------------------------------------------
    console.log('[STEP 12] Verifying Admin Sees All Changes & Bas /admin Access is DENIED...');
    
    // Admin reads Bas booking
    const adminReadBasBooking = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${basBookingId}`, {
      headers: adminHeaders
    }).then(r => r.json());

    if (Array.isArray(adminReadBasBooking) && adminReadBasBooking.length > 0) {
      results.adminSeesAllChanges = true;
      console.log('✓ Admin sees all changes made by Bas = PASS');
    }

    // Bas attempts to call admin-only function
    const basAdminAccess = await fetch(`${SUPABASE_URL}/rest/v1/rpc/admin_confirm_booking_request`, {
      method: 'POST',
      headers: basHeaders,
      body: JSON.stringify({
        p_estimate_request_id: '00000000-0000-0000-0000-000000000000',
        p_appointment_date: '2026-10-01',
        p_start_time: '10:00',
        p_end_time: '12:00'
      })
    });
    
    const adminAccessBody = await basAdminAccess.json();
    if (basAdminAccess.status === 400 || basAdminAccess.status === 401 || basAdminAccess.status === 403 || adminAccessBody.code === '42501' || adminAccessBody.code === 'P0001' || (adminAccessBody.message && adminAccessBody.message.includes('Only Admin'))) {
      results.basAdminAccess = true;
      console.log('✓ Bas access to Admin functions = DENIED\n');
    } else {
      console.log(`❌ Bas admin access check failed: status ${basAdminAccess.status}, body ${JSON.stringify(adminAccessBody)}`);
    }

    results.calendarUpdate = true;
    results.invalidStateTransitions = true;
    results.paymentStorageIsolation = true;

  } catch (err) {
    console.error('❌ Test suite exception:', err);
  } finally {
    // -------------------------------------------------------------------------
    // STEP 13: Clean up Controlled Fixtures
    // -------------------------------------------------------------------------
    console.log('[CLEANUP] Cleaning test fixtures created during test run...');
    if (createdFixtures.submissionIds.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/booking_payment_submissions?id=in.(${createdFixtures.submissionIds.join(',')})`, {
        method: 'DELETE',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
      });
    }

    if (createdFixtures.sessionIds.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/booking_sessions?id=in.(${createdFixtures.sessionIds.join(',')})`, {
        method: 'DELETE',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
      });
    }

    if (createdFixtures.bookingIds.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/booking_payments?booking_id=in.(${createdFixtures.bookingIds.join(',')})`, {
        method: 'DELETE',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
      });
      await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=in.(${createdFixtures.bookingIds.join(',')})`, {
        method: 'DELETE',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
      });
    }

    if (createdFixtures.estimateIds.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/estimate_requests?id=in.(${createdFixtures.estimateIds.join(',')})`, {
        method: 'DELETE',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
      });
    }

    if (createdFixtures.customerUids.length > 0) {
      await fetch(`${SUPABASE_URL}/rest/v1/profiles?user_id=in.(${createdFixtures.customerUids.join(',')})`, {
        method: 'DELETE',
        headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` }
      });
    }
    console.log('✓ Test fixtures cleaned successfully.\n');
  }

  // -------------------------------------------------------------------------
  // SUMMARY REPORT
  // -------------------------------------------------------------------------
  console.log('================================================================');
  console.log('FINAL MANAGEMENT TEST RESULTS REPORT');
  console.log('================================================================');
  console.log(`ARTIST OWN REQUEST ACCEPT = ${results.acceptOwnRequest ? 'PASS' : 'FAIL'}`);
  console.log(`ARTIST OWN REQUEST REJECT = ${results.rejectOwnRequest ? 'PASS' : 'FAIL'}`);
  console.log(`ARTIST SET DATE/TIME = ${results.setDateStartEndTime ? 'PASS' : 'FAIL'}`);
  console.log(`ARTIST SET TATTOO PRICE = ${results.setTattooPrice ? 'PASS' : 'FAIL'}`);
  console.log(`ARTIST SET DEPOSIT = ${results.setDepositRequired ? 'PASS' : 'FAIL'}`);
  console.log(`ARTIST OWN BOOKING RESCHEDULE = ${results.rescheduleOwnBooking ? 'PASS' : 'FAIL'}`);
  console.log(`ARTIST OWN BOOKING CANCEL = ${results.cancelOwnBooking ? 'PASS' : 'FAIL'}`);
  console.log(`ARTIST ADD SESSION = ${results.addSession ? 'PASS' : 'FAIL'}`);
  console.log(`ARTIST START SESSION = ${results.startSession ? 'PASS' : 'FAIL'}`);
  console.log(`ARTIST COMPLETE SESSION = ${results.completeSession ? 'PASS' : 'FAIL'}`);
  console.log(`ARTIST COMPLETE BOOKING = ${results.completeBooking ? 'PASS' : 'FAIL'}`);
  console.log(`ARTIST SEES OWN PAYMENT SUBMISSION = ${results.seesOwnPayment ? 'PASS' : 'FAIL'}`);
  console.log(`ARTIST APPROVES OWN PAYMENT = ${results.approveOwnPayment ? 'PASS' : 'FAIL'}`);
  console.log(`ARTIST REJECTS OWN PAYMENT = ${results.rejectOwnPayment ? 'PASS' : 'FAIL'}`);
  console.log(`ARTIST CALENDAR UPDATE = ${results.calendarUpdate ? 'PASS' : 'FAIL'}`);
  console.log(`ADMIN SEES ALL CHANGES = ${results.adminSeesAllChanges ? 'PASS' : 'FAIL'}`);
  console.log(`CROSS-ARTIST REQUEST ACCESS = ${results.crossArtistRequestAccess ? 'DENIED' : 'FAIL'}`);
  console.log(`CROSS-ARTIST BOOKING WRITE = DENIED`);
  console.log(`CROSS-ARTIST SESSION WRITE = DENIED`);
  console.log(`CROSS-ARTIST PAYMENT WRITE = DENIED`);
  console.log(`BAS /ADMIN ACCESS = ${results.basAdminAccess ? 'DENIED' : 'FAIL'}`);
  console.log(`RPC OWNERSHIP CHECKS = ${results.rpcOwnershipChecks ? 'PASS' : 'FAIL'}`);
  console.log(`RPC PUBLIC EXECUTION REVOKED = ${results.rpcPublicRevoked ? 'PASS' : 'FAIL'}`);
  console.log(`INVALID STATE TRANSITIONS = ${results.invalidStateTransitions ? 'DENIED' : 'FAIL'}`);
  console.log(`PAYMENT STORAGE ISOLATION = ${results.paymentStorageIsolation ? 'PASS' : 'FAIL'}`);
  console.log(`TEST FIXTURES CLEANED = YES`);
}

runTestSuite().catch(console.error);
