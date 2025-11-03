#!/usr/bin/env node
/**
 * Enhanced Demo Data Seeder for CampusCurator
 * Creates realistic data across all stages for complete testing
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const colors = require('colors');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Drive = require('./models/Drive');
const Group = require('./models/Group');
const Synopsis = require('./models/Synopsis');
const Submission = require('./models/Submission');
const CheckpointSubmission = require('./models/CheckpointSubmission');
const Evaluation = require('./models/Evaluation');
const Result = require('./models/Result');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected...'.cyan.bold);
  } catch (err) {
    console.error('Database connection error:'.red, err.message);
    process.exit(1);
  }
};

const seedDatabase = async () => {
  try {
    console.log('\n' + '='.repeat(60).yellow);
    console.log('CampusCurator Enhanced Demo Data Seeder'.bold.green);
    console.log('='.repeat(60).yellow + '\n');

    // Clear existing data
    console.log('Clearing existing data...'.yellow);
    await User.deleteMany();
    await Drive.deleteMany();
    await Group.deleteMany();
    await Synopsis.deleteMany();
    await Submission.deleteMany();
    await Evaluation.deleteMany();
    await Result.deleteMany();
    console.log('Data cleared'.green);

    // Create Users (Admin, Mentors, Students)
    console.log('\nCreating users...'.yellow);
    const adminUser = {
      name: 'Admin User',
      email: 'admin@campuscurator.com',
      password: 'admin123',
      role: 'admin',
      department: 'Administration'
    };

    const mentors = [
      {
        name: 'Dr. John Smith',
        email: 'john.smith@campuscurator.com',
        password: 'mentor123',
        role: 'mentor',
        department: 'Computer Science',
        maxGroupsPerMentor: 3
      },
      {
        name: 'Dr. Sarah Johnson',
        email: 'sarah.johnson@campuscurator.com',
        password: 'mentor123',
        role: 'mentor',
        department: 'Computer Science',
        maxGroupsPerMentor: 3
      },
      {
        name: 'Prof. Michael Brown',
        email: 'michael.brown@campuscurator.com',
        password: 'mentor123',
        role: 'mentor',
        department: 'Information Technology',
        maxGroupsPerMentor: 3
      },
      {
        name: 'Prof. Lisa Anderson',
        email: 'lisa.anderson@campuscurator.com',
        password: 'mentor123',
        role: 'mentor',
        department: 'Computer Science',
        maxGroupsPerMentor: 3
      }
    ];

    const students = [
      // Group 1 members
      { name: 'Alice Williams', email: 'alice.w@student.com', batch: '2025', dept: 'CS', reg: '2025CS001', group: 1, timestamp: new Date('2025-01-20T08:00:00') },
      { name: 'Bob Martinez', email: 'bob.m@student.com', batch: '2025', dept: 'CS', reg: '2025CS002', group: 1, timestamp: new Date('2025-01-20T08:00:00') },
      { name: 'Charlie Davis', email: 'charlie.d@student.com', batch: '2025', dept: 'CS', reg: '2025CS003', group: 1, timestamp: new Date('2025-01-20T08:00:00') },
      
      // Group 2 members
      { name: 'Diana Garcia', email: 'diana.g@student.com', batch: '2025', dept: 'CS', reg: '2025CS004', group: 2, timestamp: new Date('2025-01-20T08:15:00') },
      { name: 'Eve Rodriguez', email: 'eve.r@student.com', batch: '2025', dept: 'IT', reg: '2025IT001', group: 2, timestamp: new Date('2025-01-20T08:15:00') },
      
      // Group 3 members
      { name: 'Frank Wilson', email: 'frank.w@student.com', batch: '2025', dept: 'IT', reg: '2025IT002', group: 3, timestamp: new Date('2025-01-20T08:30:00') },
      { name: 'Grace Lee', email: 'grace.l@student.com', batch: '2025', dept: 'IT', reg: '2025IT003', group: 3, timestamp: new Date('2025-01-20T08:30:00') },
      { name: 'Henry Chen', email: 'henry.c@student.com', batch: '2025', dept: 'CS', reg: '2025CS005', group: 3, timestamp: new Date('2025-01-20T08:30:00') },
      
      // Ungrouped students
      { name: 'Iris Patel', email: 'iris.p@student.com', batch: '2025', dept: 'CS', reg: '2025CS006', group: null, timestamp: null },
      { name: 'Jack Thompson', email: 'jack.t@student.com', batch: '2025', dept: 'IT', reg: '2025IT004', group: null, timestamp: null }
    ];

    // Create users
    const createdUsers = await User.create([
      adminUser,
      ...mentors.map(m => ({ ...m, password: m.password })),
      ...students.map(s => ({ 
        name: s.name, 
        email: s.email, 
        password: 'student123',
        role: 'student',
        batch: s.batch,
        department: s.dept,
        registrationNumber: s.reg
      }))
    ]);

    const admin = createdUsers[0];
    const createdMentors = createdUsers.slice(1, 5);
    const createdStudents = createdUsers.slice(5);

    console.log(`Created ${createdUsers.length} users (1 admin, 4 mentors, ${createdStudents.length} students)`.green);

    // Create Drives
    console.log('\nCreating drives...'.yellow);
    
    const now = new Date();
    const drive1 = await Drive.create({
      name: 'Mini Project 2025 - Semester 6',
      description: 'Final year mini project for semester 6 students',
      academicYear: '2024-2025',
      participatingBatches: ['2025'],
      participatingStudents: createdStudents.map(s => s._id),
      mentors: createdMentors.map(m => m._id),
      maxGroupSize: 4,
      minGroupSize: 2,
      maxGroupsPerMentor: 3,
      status: 'active',
      currentStage: 'mentor-allotment',
      stages: {
        groupFormation: {
          enabled: true,
          startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          deadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
          status: 'completed'
        },
        mentorAllotment: {
          enabled: true,
          deadline: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
          status: 'active'
        },
        synopsisSubmission: {
          enabled: true,
          deadline: new Date(now.getTime() + 20 * 24 * 60 * 60 * 1000),
          status: 'not-started'
        },
        checkpoints: [
          {
            name: 'Mid-Semester Evaluation',
            deadline: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
            maxMarks: 50,
            status: 'not-started'
          },
          {
            name: 'End-Semester Evaluation',
            deadline: new Date(now.getTime() + 75 * 24 * 60 * 60 * 1000),
            maxMarks: 50,
            status: 'not-started'
          }
        ],
        result: {
          enabled: true,
          status: 'not-started'
        }
      },
      createdBy: admin._id
    });

    console.log(`Created drive: ${drive1.name}`.green);

    // Create Groups with staggered timestamps
    console.log('\nCreating groups...'.yellow);
    
    const groups = [
      {
        name: 'Team Alpha',
        drive: drive1._id,
        leader: createdStudents[0]._id,
        members: [
          { student: createdStudents[1]._id, status: 'accepted' },
          { student: createdStudents[2]._id, status: 'accepted' }
        ],
        projectTitle: 'AI-Based Student Performance Predictor',
        projectDescription: 'Using machine learning to predict student performance based on historical data',
        mentorPreferences: [
          { mentor: createdMentors[0]._id, rank: 1 },
          { mentor: createdMentors[1]._id, rank: 2 },
          { mentor: createdMentors[2]._id, rank: 3 }
        ],
        invitationCode: 'ALPHA001',
        maxMembers: 4,
        status: 'formed',
        createdAt: new Date('2025-01-20T08:00:00'),
        isLocked: false
      },
      {
        name: 'Team Beta',
        drive: drive1._id,
        leader: createdStudents[3]._id,
        members: [
          { student: createdStudents[4]._id, status: 'accepted' }
        ],
        projectTitle: 'Campus Event Management System',
        projectDescription: 'Web application for managing and promoting campus events',
        mentorPreferences: [
          { mentor: createdMentors[1]._id, rank: 1 },
          { mentor: createdMentors[2]._id, rank: 2 },
          { mentor: createdMentors[0]._id, rank: 3 }
        ],
        invitationCode: 'BETA001',
        maxMembers: 4,
        status: 'formed',
        createdAt: new Date('2025-01-20T08:15:00'),
        isLocked: false
      },
      {
        name: 'Team Gamma',
        drive: drive1._id,
        leader: createdStudents[5]._id,
        members: [
          { student: createdStudents[6]._id, status: 'accepted' },
          { student: createdStudents[7]._id, status: 'accepted' }
        ],
        projectTitle: 'IoT-Based Smart Classroom',
        projectDescription: 'Smart classroom solution using IoT devices for better learning',
        mentorPreferences: [
          { mentor: createdMentors[2]._id, rank: 1 },
          { mentor: createdMentors[0]._id, rank: 2 },
          { mentor: createdMentors[3]._id, rank: 3 }
        ],
        invitationCode: 'GAMMA001',
        maxMembers: 4,
        status: 'formed',
        createdAt: new Date('2025-01-20T08:30:00'),
        isLocked: false
      }
    ];

    const createdGroups = await Group.create(groups);
    console.log(`Created ${createdGroups.length} groups with staggered timestamps`.green);

    // Assign mentors to groups (simulate auto-allotment)
    console.log('\nAssigning mentors...'.yellow);
    createdGroups[0].assignedMentor = createdMentors[0]._id;
    createdGroups[0].mentorAllottedAt = new Date();
    createdGroups[0].status = 'mentor-assigned';
    await createdGroups[0].save();

    createdGroups[1].assignedMentor = createdMentors[1]._id;
    createdGroups[1].mentorAllottedAt = new Date();
    createdGroups[1].status = 'mentor-assigned';
    await createdGroups[1].save();

    createdGroups[2].assignedMentor = createdMentors[2]._id;
    createdGroups[2].mentorAllottedAt = new Date();
    createdGroups[2].status = 'mentor-assigned';
    await createdGroups[2].save();
    console.log('Mentors assigned (by timestamp & preference)'.green);

    // Create Synopses
    console.log('\nCreating synopses...'.yellow);
    const synopses = [
      {
        group: createdGroups[0]._id,
        drive: drive1._id,
        title: 'AI-Based Student Performance Predictor',
        abstract: 'This project aims to develop a machine learning model that predicts student academic performance based on historical data, attendance patterns, and assessment scores. The model will use various algorithms and provide actionable insights to educators.',
        submittedBy: createdStudents[0]._id,
        status: 'approved',
        reviewedBy: createdMentors[0]._id,
        reviewedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        feedback: 'Excellent proposal! Well-structured and feasible. Please ensure proper data privacy measures.',
        submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      },
      {
        group: createdGroups[1]._id,
        drive: drive1._id,
        title: 'Campus Event Management System',
        abstract: 'A comprehensive web-based platform for managing campus events including registration, ticketing, scheduling, and promotion. The system will provide real-time updates and notifications to students.',
        submittedBy: createdStudents[3]._id,
        status: 'under-review',
        submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      },
      {
        group: createdGroups[2]._id,
        drive: drive1._id,
        title: 'IoT-Based Smart Classroom',
        abstract: 'Implementation of IoT devices in classrooms for enhanced learning experience. Includes automated lighting, temperature control, and real-time student engagement tracking.',
        submittedBy: createdStudents[5]._id,
        status: 'approved',
        reviewedBy: createdMentors[2]._id,
        reviewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        feedback: 'Great initiative! Consider scalability and maintenance aspects in your implementation plan.',
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    ];

    await Synopsis.create(synopses);
    console.log(`Created ${synopses.length} synopses (2 approved, 1 under-review)`.green);

    // Create Submissions (files)
    console.log('\nCreating submissions...'.yellow);
    const submissions = [
      {
        group: createdGroups[0]._id,
        drive: drive1._id,
        submissionType: 'logbook',
        submittedBy: createdStudents[0]._id,
        description: 'Week 1-2 logbook with project kickoff notes',
        status: 'accepted',
        submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        reviewedBy: createdMentors[0]._id,
        feedback: 'Good documentation! Keep maintaining detailed entries.'
      },
      {
        group: createdGroups[0]._id,
        drive: drive1._id,
        submissionType: 'report',
        submittedBy: createdStudents[0]._id,
        status: 'accepted',
        submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        reviewedBy: createdMentors[0]._id,
        feedback: 'Well-structured report with good analysis.'
      }
    ];

    await Submission.create(submissions);
    console.log(`Created ${submissions.length} submissions (files)`.green);

    // Create Checkpoint Submissions
    console.log('\nCreating checkpoint submissions...'.yellow);
    const checkpointSubmissions = [
      {
        group: createdGroups[0]._id,
        drive: drive1._id,
        checkpointIndex: 0,
        checkpointName: 'Mid-Semester Evaluation',
        title: 'Mid-Semester Project Progress',
        description: 'Submission of mid-semester progress on AI-Based Performance Predictor',
        submittedBy: createdStudents[0]._id,
        submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        status: 'submitted'
      }
    ];

    const createdCheckpoints = await CheckpointSubmission.create(checkpointSubmissions);
    console.log(`✓ Created ${createdCheckpoints.length} checkpoint submissions`.green);

    // Create Evaluations
    console.log('\nCreating evaluations...'.yellow);
    const evaluations = [
      {
        group: createdGroups[0]._id,
        drive: drive1._id,
        checkpointSubmission: createdCheckpoints[0]._id,
        checkpointIndex: 0,
        evaluatedBy: createdMentors[0]._id,
        totalMarks: 85,
        maxMarks: 100,
        percentage: 85,
        grade: 'A',
        feedback: 'Good progress on core features. Work on UI improvements.',
        strengths: 'Well-structured code and good documentation',
        improvements: 'Focus on test coverage and edge cases',
        status: 'submitted'
      }
    ];

    await Evaluation.create(evaluations);
    console.log(`✓ Created ${evaluations.length} evaluations`.green);

    // Create Results
    console.log('\nCreating results...'.yellow);
    const results = [
      {
        group: createdGroups[0]._id,
        drive: drive1._id,
        groupName: 'Team Alpha',
        driveName: drive1.name,
        logbook_marks: 18,
        synopsis_marks: 20,
        report_marks: 17,
        ppt_marks: 16,
        midsem_marks: 85,
        endsem_marks: 0,
        final_marks: 78,
        grade: 'A',
        feedback: 'Excellent project execution. Keep up the good work!',
        status: 'draft'
      }
    ];

    await Result.create(results);
    console.log(`✓ Created ${results.length} results`.green);

    // Summary
    console.log('\n' + '='.repeat(60).yellow);
    console.log('Demo Data Seeding Complete!'.bold.green);
    console.log('='.repeat(60).yellow);
    console.log('\n Summary:'.bold);
    console.log(`   • 1 Admin, 4 Mentors, 10 Students (3 groups, 2 ungrouped)`.cyan);
    console.log(`   • 1 Active Drive (Semester 6)`.cyan);
    console.log(`   • 3 Groups with staggered timestamps (for FIFO testing)`.cyan);
    console.log(`   • 3 Synopses (2 approved, 1 under-review)`.cyan);
    console.log(`   • 2 Submissions (files)`.cyan);
    console.log(`   • 1 Evaluation (checkpoint)`.cyan);
    console.log(`   • 1 Result (final marks)`.cyan);
    console.log('\n Test Credentials:'.bold);
    console.log('   Admin:   admin@campuscurator.com / admin123');
    console.log('   Mentor:  sarah.johnson@campuscurator.com / mentor123');
    console.log('   Student: alice.w@student.com / student123');
    console.log('\n Ready to test complete workflow!'.bold.green);
    console.log('='.repeat(60).yellow + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n Seeding Error:'.bold.red, error.message);
    console.error(error);
    process.exit(1);
  }
};

// Run seeder
connectDB().then(() => seedDatabase());
