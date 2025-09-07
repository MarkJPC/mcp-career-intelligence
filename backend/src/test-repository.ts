import { initializeDatabase, seedDatabase } from './database';
import { testRepositoryPattern, PortfolioService } from './queries';

async function demonstrateArchitecture() {
  try {
    await initializeDatabase();
    await seedDatabase();
    
    console.log('=== REPOSITORY PATTERN DEMO ===');
    await testRepositoryPattern();
    
    console.log('\n=== PORTFOLIO SERVICE DEMO ===');
    const portfolioData = await PortfolioService.getPortfolioData();
    console.log('Portfolio API Response:', JSON.stringify(portfolioData, null, 2));
    
  } catch (error) {
    console.error('❌ Architecture demo failed:', error);
  }
}

demonstrateArchitecture();