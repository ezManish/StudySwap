const http = require('node:http');
const assert = require('node:assert');
const server = require('../src/server');
const { getDatabase, resetDatabase } = require('../src/db');

const TEST_PORT = 3334;
const BASE_URL = `http://localhost:${TEST_PORT}`;

async function runConcurrencyTest() {
  console.log('===================================================================');
  console.log(' StudySwap Concurrency Stress Test');
  console.log(' Testing simultaneous race conditions on S2 (Capacity: 2)');
  console.log('===================================================================\n');

  await new Promise(resolve => server.listen(TEST_PORT, resolve));
  resetDatabase();

  const NUM_CONCURRENT_REQUESTS = 10;
  console.log(`Sending ${NUM_CONCURRENT_REQUESTS} simultaneous POST /bookings requests for S2...`);

  const requests = [];
  for (let i = 1; i <= NUM_CONCURRENT_REQUESTS; i++) {
    const alias = `racer_${i}`;
    requests.push(
      fetch(`${BASE_URL}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: 'S2', alias })
      }).then(async res => ({
        alias,
        status: res.status,
        body: await res.json()
      }))
    );
  }

  // Fire all requests at the exact same instant
  const results = await Promise.all(requests);

  let successCount = 0;
  let rejectedCount = 0;

  console.log('\nResults Breakdown:');
  results.forEach(r => {
    if (r.status === 201) {
      successCount++;
      console.log(`  [201 CREATED]  Seat booked for alias "${r.alias}" -> id: ${r.body.id}`);
    } else if (r.status === 409) {
      rejectedCount++;
      console.log(`  [409 CONFLICT] Rejected overbooking for alias "${r.alias}" -> error: ${r.body.error}`);
    } else {
      console.log(`  [${r.status} UNEXPECTED] alias "${r.alias}" -> ${JSON.stringify(r.body)}`);
    }
  });

  console.log('\n-------------------------------------------------------------------');
  console.log(`Total Requests:    ${NUM_CONCURRENT_REQUESTS}`);
  console.log(`Successful (201):  ${successCount} (Expected: exactly 2)`);
  console.log(`Rejected (409):    ${rejectedCount} (Expected: exactly 8)`);

  const db = getDatabase();
  const dbCount = db.prepare("SELECT COUNT(*) as count FROM bookings WHERE sessionId = 'S2' AND status = 'confirmed'").get();
  console.log(`Database count:    ${dbCount.count} (Must be strictly <= 2)`);
  console.log('-------------------------------------------------------------------');

  server.close(() => {
    if (successCount === 2 && rejectedCount === 8 && dbCount.count === 2) {
      console.log('\n✅ CONCURRENCY TEST PASSED: Zero overbooking verified under heavy race condition!\n');
    } else {
      console.error('\n❌ CONCURRENCY TEST FAILED: Overbooking occurred!\n');
      process.exitCode = 1;
    }
  });
}

if (require.main === module) {
  runConcurrencyTest();
}
