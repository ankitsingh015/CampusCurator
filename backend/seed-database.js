#!/usr/bin/env node
/**
 * CampusCurator Database Seeder
 * Seeds sample users (admin, mentors, students) for testing
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Import the seeder
const seeder = require(path.join(__dirname, './seeder.js'));

console.log('Starting CampusCurator database seeder...\n');
