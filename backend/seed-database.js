#!/usr/bin/env node
/**
 * Mini Project Management System Database Seeder
 * Seeds sample users (admin, mentors, students) for testing
 */

const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

// Import the seeder from database folder
const seeder = require(path.join(__dirname, '../database/seeder.js'));

console.log('Starting Mini Project Management System database seeder...\n');
