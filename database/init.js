#!/usr/bin/env node

/**
 * Database initialization script for Quinceañera CMS
 * This script creates and sets up the local D1 database for development
 */

import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_NAME = 'julifestdb';
const MIGRATIONS_DIR = join(__dirname, 'migrations');

async function runCommand(command, description) {
  console.log(`\n🔄 ${description}...`);
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${description} completed successfully`);
    if (output.trim()) {
      console.log(output);
    }
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`);
    console.error(error.message);
    if (error.stdout) console.log('STDOUT:', error.stdout);
    if (error.stderr) console.log('STDERR:', error.stderr);
    return false;
  }
}

async function executeMigration(migrationFile) {
  console.log(`\n📄 Executing migration: ${migrationFile}`);
  try {
    const migrationPath = join(MIGRATIONS_DIR, migrationFile);
    const sql = await readFile(migrationPath, 'utf8');
    
    // Write SQL to temporary file for wrangler
    const tempFile = '/tmp/migration.sql';
    await writeFile(tempFile, sql);
    
    const command = `wrangler d1 execute ${DATABASE_NAME} --local --file=${tempFile}`;
    return await runCommand(command, `Running ${migrationFile}`);
  } catch (error) {
    console.error(`❌ Failed to execute migration ${migrationFile}:`, error.message);
    return false;
  }
}

async function initializeDatabase() {
  console.log('🚀 Initializing Quinceañera CMS Database...\n');

  // Check if wrangler is installed
  console.log('🔍 Checking Wrangler CLI...');
  try {
    execSync('wrangler --version', { stdio: 'pipe' });
    console.log('✅ Wrangler CLI is installed');
  } catch (error) {
    console.error('❌ Wrangler CLI not found. Please install it first:');
    console.error('npm install -g wrangler');
    process.exit(1);
  }

  // Create D1 database locally
  const createDbSuccess = await runCommand(
    `wrangler d1 create ${DATABASE_NAME}`,
    'Creating D1 database'
  );

  if (!createDbSuccess) {
    console.log('⚠️  Database might already exist, continuing...');
  }

  // Run migrations
  const migrations = [
    '0001_initial_schema.sql',
    '0002_seed_data.sql',
    '0003_restructure_invitations.sql'
  ];

  console.log('\n📋 Running database migrations...');
  
  for (const migration of migrations) {
    const success = await executeMigration(migration);
    if (!success) {
      console.error(`❌ Migration ${migration} failed. Stopping.`);
      process.exit(1);
    }
  }

  console.log('\n🎉 Database initialization completed successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Update your wrangler.toml with the database binding');
  console.log('2. Deploy to production: wrangler deploy');
  console.log('3. Run production migrations if needed');
  console.log('\n💡 Default admin credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('   ⚠️  CHANGE THESE IMMEDIATELY IN PRODUCTION!');
}

// Run the initialization
initializeDatabase().catch(error => {
  console.error('💥 Initialization failed:', error);
  process.exit(1);
}); 