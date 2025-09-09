import sqlite3 from 'sqlite3';
import { Database } from 'sqlite3';
import path from 'path';

// Database connection setup
const dbPath = path.join(__dirname, '../portfolio.db');
export const db: Database = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('✓ Connected to SQLite database');
  }
});

// Initialize database schema
export const initializeDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Enable foreign key constraints
    db.run('PRAGMA foreign_keys = ON', (err) => {
      if (err) {
        reject(err);
        return;
      }

      // Create all tables in the correct order (dependencies first)
      createTables()
        .then(() => {
          console.log('✓ Database schema initialized successfully');
          resolve();
        })
        .catch(reject);
    });
  });
};

const createTables = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const tables = [
      // Projects table - your main work experiences
      `CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        company TEXT NOT NULL,
        role TEXT NOT NULL,
        start_date TEXT NOT NULL,
        end_date TEXT,
        status TEXT DEFAULT 'completed' CHECK (status IN ('ongoing', 'completed', 'planned')),
        description TEXT,
        impact_metric TEXT,
        github_url TEXT,
        live_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Technologies table - reusable skill inventory
      `CREATE TABLE IF NOT EXISTS technologies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        category TEXT NOT NULL CHECK (category IN ('language', 'framework', 'database', 'tool', 'platform')),
        proficiency_level TEXT DEFAULT 'intermediate' CHECK (proficiency_level IN ('beginner', 'intermediate', 'advanced', 'expert')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Project-Technology relationship (many-to-many)
      `CREATE TABLE IF NOT EXISTS project_technologies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        technology_id INTEGER NOT NULL,
        usage_context TEXT, -- e.g., "Primary backend framework", "Data visualization"
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (technology_id) REFERENCES technologies(id) ON DELETE CASCADE,
        UNIQUE(project_id, technology_id)
      )`,

      // Achievements table - specific accomplishments within projects
      `CREATE TABLE IF NOT EXISTS achievements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        technical_details TEXT,
        quantified_impact TEXT, -- "Reduced response time by 70%", "Processed 240 lines/second"
        achievement_type TEXT DEFAULT 'technical' CHECK (achievement_type IN ('technical', 'business', 'leadership', 'process')),
        is_resume_worthy BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )`,

      // Blog posts table - your daily progress updates
      `CREATE TABLE IF NOT EXISTS blog_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT,
        status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
        tags TEXT, -- JSON array of tags
        project_id INTEGER, -- Optional: link to related project
        published_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
      )`
    ];

    // Execute each table creation
    let completed = 0;
    tables.forEach((tableSQL, index) => {
      db.run(tableSQL, (err) => {
        if (err) {
          reject(new Error(`Failed to create table ${index + 1}: ${err.message}`));
          return;
        }
        
        completed++;
        if (completed === tables.length) {
          resolve();
        }
      });
    });
  });
};

// Seed data function - populate with your actual experience
export const seedDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // First, check if data already exists
    db.get('SELECT COUNT(*) as count FROM projects', (err, row: any) => {
      if (err) {
        reject(err);
        return;
      }

      if (row.count > 0) {
        console.log('✓ Database already contains data, skipping seed');
        resolve();
        return;
      }

      // Insert seed data
      insertSeedData()
        .then(() => {
          console.log('✓ Database seeded with initial data');
          resolve();
        })
        .catch(reject);
    });
  });
};

const insertSeedData = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Sample data based on your actual experience
    const seedOperations = [
      // Insert technologies first
      () => insertTechnologies(),
      // Then projects
      () => insertProjects(),
      // Then link them together
      () => linkProjectTechnologies(),
      // Finally add achievements
      () => insertAchievements()
    ];

    // Execute operations sequentially
    executeSequentially(seedOperations)
      .then(resolve)
      .catch(reject);
  });
};

// Helper function to execute promises sequentially
const executeSequentially = (operations: Array<() => Promise<void>>): Promise<void> => {
  return operations.reduce((promise, operation) => {
    return promise.then(operation);
  }, Promise.resolve());
};

// Seed data insertion functions
const insertTechnologies = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const technologies = [
      ['TypeScript', 'language', 'advanced'],
      ['React', 'framework', 'advanced'],
      ['Node.js', 'framework', 'intermediate'],
      ['C#', 'language', 'intermediate'],
      ['.NET', 'framework', 'intermediate'],
      ['SQLite', 'database', 'intermediate'],
      ['PostgreSQL', 'database', 'intermediate'],
      ['Power Platform', 'platform', 'intermediate'],
      ['Electron', 'framework', 'intermediate'],
      ['Vercel', 'platform', 'intermediate']
    ];

    const stmt = db.prepare('INSERT INTO technologies (name, category, proficiency_level) VALUES (?, ?, ?)');
    
    let completed = 0;
    technologies.forEach(([name, category, proficiency]) => {
      stmt.run(name, category, proficiency, (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }
        completed++;
        if (completed === technologies.length) {
          stmt.finalize();
          resolve();
        }
      });
    });
  });
};

const insertProjects = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    const projects = [
      [
        'Enterprise Power Platform Architecture',
        'Intelbyte Corp',
        'Power Platform Developer Intern',
        '2025-06-01',
        null, // ongoing
        'ongoing',
        'Developed comprehensive project management application with 5-screen architecture and dual SharePoint data source integration.',
        '5-screen application serving 50+ users',
        null,
        null
      ],
      [
        'AI-Driven Customer Service Platform',
        'Grey Bruce Plumbing',
        'Software Developer - Contract',
        '2025-02-01',
        '2025-03-01',
        'completed',
        'Full-stack web application with React/TypeScript frontend and AI-powered customer service capabilities.',
        '70% automation of routine customer inquiries',
        'https://github.com/markjpc/grey-bruce-platform',
        'https://greybruceplumbing.com'
      ],
      [
        'High-Performance Telemetry Processing System',
        'GEOPSI',
        'Software Engineer Intern',
        '2024-05-01',
        '2024-08-01',
        'completed',
        'C# .NET application handling real-time telemetry data with cross-platform desktop interface.',
        '240 lines/second processing with real-time visualization',
        null,
        null
      ]
    ];

    const stmt = db.prepare(`
      INSERT INTO projects (title, company, role, start_date, end_date, status, description, impact_metric, github_url, live_url) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    let completed = 0;
    projects.forEach((project) => {
      stmt.run(...project, (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }
        completed++;
        if (completed === projects.length) {
          stmt.finalize();
          resolve();
        }
      });
    });
  });
};

const linkProjectTechnologies = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // This would link your projects to technologies
    // Implementation depends on your specific tech stack per project
    resolve(); // Placeholder for now
  });
};

const insertAchievements = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Sample achievements based on your resume
    const achievements = [
      [
        1, // Intelbyte project
        'SharePoint Integration Architecture',
        'Implemented advanced data relationships using SharePoint lookup columns to establish task-project hierarchies',
        'Used SharePoint lookup columns to mimic relational schemas in traditional SQL settings',
        'Reduced data management complexity by 60%',
        'technical',
        1
      ],
      [
        2, // Grey Bruce project
        'AI Integration Implementation',
        'Engineered conversational interface using Dialogflow NLP for automated customer support',
        'Integrated Dialogflow with React frontend using WebSocket connections for real-time responses',
        'Reduced customer support response time by 70%',
        'technical',
        1
      ],
      [
        3, // GEOPSI project
        'Real-time Data Processing',
        'Engineered C# .NET telemetry processing application handling high-frequency data streams',
        'Implemented asynchronous processing pipelines with custom buffering strategies',
        'Achieved 240 lines/second processing rate with <100ms latency',
        'technical',
        1
      ]
    ];

    const stmt = db.prepare(`
      INSERT INTO achievements (project_id, title, description, technical_details, quantified_impact, achievement_type, is_resume_worthy) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    let completed = 0;
    achievements.forEach((achievement) => {
      stmt.run(...achievement, (err: Error | null) => {
        if (err) {
          reject(err);
          return;
        }
        completed++;
        if (completed === achievements.length) {
          stmt.finalize();
          resolve();
        }
      });
    });
  });
};

// Graceful shutdown
export const closeDatabase = (): Promise<void> => {
  return new Promise((resolve) => {
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err.message);
      } else {
        console.log('✓ Database connection closed');
      }
      resolve();
    });
  });
};