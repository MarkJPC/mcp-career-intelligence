import { db } from './database';

// ========================================
// PRODUCTION PATTERN: Query Abstraction Layer
// ========================================

// This demonstrates how real companies structure database access
// It's more sophisticated than Prisma for learning, but cleaner than raw callbacks

// Base query interface - all queries follow this pattern
interface QueryResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Generic query executor with error handling and logging
class DatabaseQuery {
  // Execute a query that returns multiple rows
  static async all<T>(sql: string, params: any[] = []): Promise<QueryResult<T[]>> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      db.all(sql, params, (err, rows) => {
        const duration = Date.now() - startTime;
        
        if (err) {
          console.error(`❌ Query failed (${duration}ms):`, sql, err.message);
          resolve({ success: false, error: err.message });
        } else {
          console.log(`✅ Query executed (${duration}ms): Found ${rows.length} rows`);
          resolve({ success: true, data: rows as T[] });
        }
      });
    });
  }

  // Execute a query that returns a single row
  static async get<T>(sql: string, params: any[] = []): Promise<QueryResult<T | null>> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      db.get(sql, params, (err, row) => {
        const duration = Date.now() - startTime;
        
        if (err) {
          console.error(`❌ Query failed (${duration}ms):`, sql, err.message);
          resolve({ success: false, error: err.message });
        } else {
          console.log(`✅ Query executed (${duration}ms): ${row ? 'Found' : 'No'} result`);
          resolve({ success: true, data: row as T || null });
        }
      });
    });
  }

  // Execute a query that modifies data (INSERT, UPDATE, DELETE)
  static async run(sql: string, params: any[] = []): Promise<QueryResult<{ id?: number; changes: number }>> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      
      db.run(sql, params, function(err) {
        const duration = Date.now() - startTime;
        
        if (err) {
          console.error(`❌ Query failed (${duration}ms):`, sql, err.message);
          resolve({ success: false, error: err.message });
        } else {
          console.log(`✅ Query executed (${duration}ms): ${this.changes} rows affected`);
          resolve({ 
            success: true, 
            data: { 
              id: this.lastID, 
              changes: this.changes 
            }
          });
        }
      });
    });
  }
}

// ========================================
// TYPE-SAFE DATA MODELS
// ========================================

// Define your data types (this is what Prisma would generate automatically)
export interface Project {
  id: number;
  title: string;
  company: string;
  role: string;
  start_date: string;
  end_date?: string;
  status: 'ongoing' | 'completed' | 'planned';
  description?: string;
  impact_metric?: string;
  github_url?: string;
  live_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Technology {
  id: number;
  name: string;
  category: 'language' | 'framework' | 'database' | 'tool' | 'platform';
  proficiency_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  created_at: string;
}

export interface Achievement {
  id: number;
  project_id: number;
  title: string;
  description: string;
  technical_details?: string;
  quantified_impact?: string;
  achievement_type: 'technical' | 'business' | 'leadership' | 'process';
  is_resume_worthy: boolean;
  created_at: string;
}

export interface ProjectWithTechnologies extends Project {
  technologies: Technology[];
}

export interface ProjectWithAchievements extends Project {
  achievements: Achievement[];
}

export interface FullProject extends Project {
  technologies: Technology[];
  achievements: Achievement[];
}

// ========================================
// BUSINESS LOGIC LAYER - Repository Pattern
// ========================================

// This is how senior engineers structure data access
export class ProjectRepository {
  
  // Get all projects with optional filtering
  static async findAll(filters?: {
    company?: string;
    status?: string;
    technology?: string;
  }): Promise<Project[]> {
    let sql = `
      SELECT DISTINCT p.*
      FROM projects p
    `;
    
    const conditions: string[] = [];
    const params: any[] = [];

    // Dynamic query building based on filters
    if (filters?.technology) {
      sql += `
        JOIN project_technologies pt ON p.id = pt.project_id
        JOIN technologies t ON pt.technology_id = t.id
      `;
      conditions.push('t.name = ?');
      params.push(filters.technology);
    }

    if (filters?.company) {
      conditions.push('p.company = ?');
      params.push(filters.company);
    }

    if (filters?.status) {
      conditions.push('p.status = ?');
      params.push(filters.status);
    }

    if (conditions.length > 0) {
      sql += ` WHERE ${conditions.join(' AND ')}`;
    }

    sql += ' ORDER BY p.start_date DESC';

    const result = await DatabaseQuery.all<Project>(sql, params);
    return result.success ? result.data! : [];
  }

  // Get project with all related data
  static async findByIdWithDetails(id: number): Promise<FullProject | null> {
    // This demonstrates parallel async execution (your insight #3!)
    const [projectResult, technologiesResult, achievementsResult] = await Promise.all([
      DatabaseQuery.get<Project>('SELECT * FROM projects WHERE id = ?', [id]),
      this.getTechnologiesForProject(id),
      this.getAchievementsForProject(id)
    ]);

    if (!projectResult.success || !projectResult.data) {
      return null;
    }

    return {
      ...projectResult.data,
      technologies: technologiesResult,
      achievements: achievementsResult
    };
  }

  // Get projects optimized for recruiter viewing
  static async getRecruiterSummary(): Promise<{
    featuredProjects: ProjectWithTechnologies[];
    totalProjects: number;
    topTechnologies: { name: string; projectCount: number }[];
    companiesWorkedWith: string[];
  }> {
    // Complex business logic that combines multiple queries
    const [allProjects, techStats] = await Promise.all([
      this.findAllWithTechnologies(),
      TechnologyRepository.getUsageStats()
    ]);

    const featuredProjects = allProjects
      .filter(p => p.impact_metric) // Only projects with quantified impact
      .slice(0, 3); // Top 3 most recent

    return {
      featuredProjects,
      totalProjects: allProjects.length,
      topTechnologies: techStats.slice(0, 5),
      companiesWorkedWith: [...new Set(allProjects.map(p => p.company))]
    };
  }

  // Private helper methods
  private static async findAllWithTechnologies(): Promise<ProjectWithTechnologies[]> {
    const sql = `
      SELECT 
        p.*,
        GROUP_CONCAT(
          JSON_OBJECT(
            'id', t.id,
            'name', t.name,
            'category', t.category,
            'proficiency_level', t.proficiency_level
          )
        ) as technologies_json
      FROM projects p
      LEFT JOIN project_technologies pt ON p.id = pt.project_id
      LEFT JOIN technologies t ON pt.technology_id = t.id
      GROUP BY p.id
      ORDER BY p.start_date DESC
    `;

    const result = await DatabaseQuery.all<any>(sql);
    if (!result.success) return [];

    // Transform JSON strings back to objects (your insight #4 - API layer transformation!)
    return result.data!.map(row => ({
      ...row,
      technologies: row.technologies_json 
        ? JSON.parse(`[${row.technologies_json}]`)
        : []
    }));
  }

  private static async getTechnologiesForProject(projectId: number): Promise<Technology[]> {
    const sql = `
      SELECT t.*
      FROM technologies t
      JOIN project_technologies pt ON t.id = pt.technology_id
      WHERE pt.project_id = ?
      ORDER BY t.category, t.name
    `;

    const result = await DatabaseQuery.all<Technology>(sql, [projectId]);
    return result.success ? result.data! : [];
  }

  private static async getAchievementsForProject(projectId: number): Promise<Achievement[]> {
    const sql = `
      SELECT * FROM achievements 
      WHERE project_id = ? 
      ORDER BY is_resume_worthy DESC, created_at DESC
    `;

    const result = await DatabaseQuery.all<Achievement>(sql, [projectId]);
    return result.success ? result.data! : [];
  }
}

// ========================================
// TECHNOLOGY REPOSITORY
// ========================================

export class TechnologyRepository {
  static async getUsageStats(): Promise<{ name: string; projectCount: number; category: string }[]> {
    const sql = `
      SELECT 
        t.name,
        t.category,
        COUNT(pt.project_id) as projectCount
      FROM technologies t
      LEFT JOIN project_technologies pt ON t.id = pt.technology_id
      GROUP BY t.id
      ORDER BY projectCount DESC, t.name
    `;

    const result = await DatabaseQuery.all<any>(sql);
    return result.success ? result.data! : [];
  }

  static async findByCategory(category: string): Promise<Technology[]> {
    const result = await DatabaseQuery.all<Technology>(
      'SELECT * FROM technologies WHERE category = ? ORDER BY name',
      [category]
    );
    return result.success ? result.data! : [];
  }
}

// ========================================
// EXAMPLE USAGE - What your API endpoints would use
// ========================================

export class PortfolioService {
  // This is what your REST API endpoints will call
  static async getPortfolioData() {
    try {
      console.log('🔄 Generating portfolio data...');
      
      const [
        allProjects,
        recruiterSummary,
        techStats
      ] = await Promise.all([
        ProjectRepository.findAll(),
        ProjectRepository.getRecruiterSummary(),
        TechnologyRepository.getUsageStats()
      ]);

      return {
        success: true,
        data: {
          projects: allProjects,
          summary: recruiterSummary,
          technologies: techStats
        }
      };
    } catch (error) {
      console.error('❌ Failed to generate portfolio data:', error);
      return {
        success: false,
        error: 'Failed to load portfolio data'
      };
    }
  }

  // Example: Get data for a specific page/component
  static async getProjectShowcase(projectId?: number) {
    if (projectId) {
      const project = await ProjectRepository.findByIdWithDetails(projectId);
      return { success: true, data: { project } };
    } else {
      const summary = await ProjectRepository.getRecruiterSummary();
      return { success: true, data: summary };
    }
  }
}

// ========================================
// TESTING YOUR ARCHITECTURE
// ========================================

export async function testRepositoryPattern() {
  console.log('🧪 Testing Repository Pattern...\n');

  try {
    // Test 1: Basic project retrieval
    console.log('1. Getting all projects:');
    const projects = await ProjectRepository.findAll();
    console.log(`Found ${projects.length} projects\n`);

    // Test 2: Filtered retrieval
    console.log('2. Getting React projects:');
    const reactProjects = await ProjectRepository.findAll({ technology: 'React' });
    console.log(`Found ${reactProjects.length} React projects\n`);

    // Test 3: Complex aggregation
    console.log('3. Getting recruiter summary:');
    const summary = await ProjectRepository.getRecruiterSummary();
    console.log('Featured projects:', summary.featuredProjects.length);
    console.log('Companies:', summary.companiesWorkedWith);
    console.log('Top tech:', summary.topTechnologies.slice(0, 3));
    console.log('');

    // Test 4: Full project details
    if (projects.length > 0) {
      console.log('4. Getting full project details:');
      if(projects[0]) {
        const fullProject = await ProjectRepository.findByIdWithDetails(projects[0].id);
        console.log('Project:', fullProject?.title);
        console.log('Technologies:', fullProject?.technologies.length);
        console.log('Achievements:', fullProject?.achievements.length);
      }
    }

    console.log('✅ Repository pattern test completed successfully!');
  } catch (error) {
    console.error('❌ Repository test failed:', error);
  }
}

export { DatabaseQuery };
