import { initializeDatabase, seedDatabase, closeDatabase } from '../database/database';

async function testDatabase() {
  try {
    await initializeDatabase();
    await seedDatabase();
    console.log('✅ Database test successful!');
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await closeDatabase();
  }
}

testDatabase();