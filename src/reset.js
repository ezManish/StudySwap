const { resetDatabase } = require('./db');

try {
  console.log('--- Resetting StudySwap Database ---');
  const records = resetDatabase();
  console.log(`Successfully reset database and restored ${records.length} seed sessions:`);
  records.forEach(r => {
    console.log(`  - [${r.id}] ${r.title} | Day ${r.project_day} at ${r.time} | Capacity: ${r.capacity}`);
  });
  console.log('Database reset to clean initial state.');
  process.exit(0);
} catch (err) {
  console.error('Error resetting database:', err.message);
  process.exit(1);
}

