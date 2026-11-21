const { initSchema, seedSessions } = require('./db');

try {
  console.log('--- Seeding StudySwap Database ---');
  initSchema();
  const records = seedSessions();
  console.log(`Successfully seeded ${records.length} sessions from CSV:`);
  records.forEach(r => {
    console.log(`  - [${r.id}] ${r.title} | Day ${r.project_day} at ${r.time} | Capacity: ${r.capacity}`);
  });
  console.log('Database initialization and seeding completed successfully.');
  process.exit(0);
} catch (err) {
  console.error('Error seeding database:', err.message);
  process.exit(1);
}

