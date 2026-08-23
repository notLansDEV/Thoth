/**
 * Database Initialization Example
 * Run this when your application starts to set up the database
 */

import {
  initializeDatabase,
  initializeSchema,
  healthCheck,
  closeDatabase
} from './database.js';

import {
  workspaceRepository,
  projectRepository,
  activityRepository
} from './repositories/index.js';

/**
 * Initialize the database with schema and seed data
 */
export async function setupDatabase() {
  try {
    console.log('🔧 Initializing database...');

    // Initialize connection pool
    initializeDatabase({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME
    });

    // Check connection
    const health = await healthCheck();
    if (health.status !== 'ok') {
      throw new Error(`Database health check failed: ${health.error}`);
    }
    console.log('✅ Database connection established');

    // Initialize schema
    await initializeSchema();
    console.log('✅ Database schema initialized');

    return true;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

/**
 * Create sample data for development
 */
export async function seedDatabase() {
  try {
    console.log('🌱 Seeding database with sample data...');

    // Create sample workspace
    const workspace = await workspaceRepository.create({
      name: 'Development Workspace',
      slug: 'dev-workspace',
      description: 'Sample workspace for development'
    });
    console.log(`✅ Created workspace: ${workspace.id}`);

    // Create sample project
    const project = await projectRepository.create({
      workspace_id: workspace.id,
      name: 'Sample Project',
      slug: 'sample-project',
      description: 'A sample project to get started',
      status: 'active'
    });
    console.log(`✅ Created project: ${project.id}`);

    // Log activity
    await activityRepository.log(
      workspace.id,
      'workspace',
      'created',
      workspace.id,
      null,
      { name: workspace.name }
    );

    await activityRepository.log(
      workspace.id,
      'project',
      'created',
      project.id,
      null,
      { name: project.name },
      project.id
    );

    console.log('✅ Database seeding complete');
    return { workspace, project };
  } catch (error) {
    console.error('❌ Database seeding failed:', error.message);
    throw error;
  }
}

/**
 * Shutdown database gracefully
 */
export async function shutdownDatabase() {
  try {
    console.log('🔌 Shutting down database connection...');
    await closeDatabase();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error closing database:', error.message);
  }
}

// Export for use in application
export default {
  setupDatabase,
  seedDatabase,
  shutdownDatabase
};

/**
 * Usage in your main application file:
 *
 * import { setupDatabase, shutdownDatabase } from './db/init.js';
 *
 * async function main() {
 *   try {
 *     await setupDatabase();
 *     // Your application code here
 *   } catch (error) {
 *     console.error('Fatal error:', error);
 *     process.exit(1);
 *   } finally {
 *     await shutdownDatabase();
 *   }
 * }
 *
 * main();
 */
