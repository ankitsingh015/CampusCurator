const mongoose = require('mongoose');
const dotenv = require('dotenv');
const colors = require('colors');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../backend/.env') });
const User = require(path.join(__dirname, './User'));
const Drive = require(path.join(__dirname, './Drive'));
const Group = require(path.join(__dirname, './Group'));
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected...'.cyan.bold);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};
const users = [
  {
    name: 'Admin User',
    email: 'admin@campuscurator.com',
    password: 'admin123',
    role: 'admin',
    department: 'Administration'
  },
  {
    name: 'Dr. John Smith',
    email: 'john.smith@campuscurator.com',
    password: 'mentor123',
    role: 'mentor',
    department: 'Computer Science'
  },
  {
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@campuscurator.com',
    password: 'mentor123',
    role: 'mentor',
    department: 'Computer Science'
  },
  {
    name: 'Prof. Michael Brown',
    email: 'michael.brown@campuscurator.com',
    password: 'mentor123',
    role: 'mentor',
    department: 'Information Technology'
  },
  {
    name: 'Alice Williams',
    email: 'alice.w@student.com',
    password: 'student123',
    role: 'student',
    batch: '2025',
    department: 'Computer Science',
    registrationNumber: '2025CS001'
  },
  {
    name: 'Bob Martinez',
    email: 'bob.m@student.com',
    password: 'student123',
    role: 'student',
    batch: '2025',
    department: 'Computer Science',
    registrationNumber: '2025CS002'
  },
  {
    name: 'Charlie Davis',
    email: 'charlie.d@student.com',
    password: 'student123',
    role: 'student',
    batch: '2025',
    department: 'Computer Science',
    registrationNumber: '2025CS003'
  },
  {
    name: 'Diana Garcia',
    email: 'diana.g@student.com',
    password: 'student123',
    role: 'student',
    batch: '2025',
    department: 'Computer Science',
    registrationNumber: '2025CS004'
  },
  {
    name: 'Eve Rodriguez',
    email: 'eve.r@student.com',
    password: 'student123',
    role: 'student',
    batch: '2025',
    department: 'Information Technology',
    registrationNumber: '2025IT001'
  },
  {
    name: 'Frank Wilson',
    email: 'frank.w@student.com',
    password: 'student123',
    role: 'student',
    batch: '2025',
    department: 'Information Technology',
    registrationNumber: '2025IT002'
  }
];
const seedData = async () => {
  try {
    await connectDB();
    console.log('Clearing existing data...'.yellow);
    await User.deleteMany();
    await Drive.deleteMany();
    await Group.deleteMany();
    console.log('Existing data cleared.'.green);
    console.log('Creating users...'.yellow);
    const createdUsers = await User.create(users);
    console.log(`${createdUsers.length} users created.`.green);
    const admin = createdUsers.find(u => u.role === 'admin');
    const mentors = createdUsers.filter(u => u.role === 'mentor');
    const students = createdUsers.filter(u => u.role === 'student');
    console.log('Creating sample drive...'.yellow);
    const drive = await Drive.create({
      name: 'Mini Project 2025 - Semester 6',
      description: 'Final year mini project for 2025 batch students',
      academicYear: '2024-2025',
      participatingBatches: ['2025'],
      participatingStudents: students.map(s => s._id),
      mentors: mentors.map(m => m._id),
      maxGroupSize: 4,
      minGroupSize: 2,
      maxGroupsPerMentor: 3,
      stages: {
        groupFormation: {
          enabled: true,
          startDate: new Date('2025-01-15'),
          deadline: new Date('2025-01-31'),
          status: 'active'
        },
        mentorAllotment: {
          enabled: true,
          deadline: new Date('2025-02-07'),
          status: 'not-started'
        },
        synopsisSubmission: {
          enabled: true,
          deadline: new Date('2025-02-28'),
          status: 'not-started'
        },
        checkpoints: [
          {
            name: 'Mid-Semester Evaluation',
            deadline: new Date('2025-03-30'),
            maxMarks: 50,
            status: 'not-started'
          },
          {
            name: 'End-Semester Evaluation',
            deadline: new Date('2025-05-15'),
            maxMarks: 50,
            status: 'not-started'
          }
        ],
        result: {
          enabled: true,
          deadline: new Date('2025-05-30'),
          status: 'not-started'
        }
      },
      status: 'active',
      currentStage: 'group-formation',
      createdBy: admin._id
    });
    console.log('Sample drive created.'.green);
    console.log('Creating sample groups...'.yellow);
    const groups = [
      {
        name: 'Team Alpha',
        drive: drive._id,
        leader: students[0]._id,
        members: [
          { student: students[1]._id, status: 'accepted' },
          { student: students[2]._id, status: 'accepted' }
        ],
        invitationCode: 'ALPHA001',
        maxMembers: 4,
        mentorPreferences: [
          { mentor: mentors[0]._id, rank: 1 },
          { mentor: mentors[1]._id, rank: 2 }
        ],
        status: 'formed',
        projectTitle: 'AI-based Student Performance Predictor'
      },
      {
        name: 'Team Beta',
        drive: drive._id,
        leader: students[3]._id,
        members: [
          { student: students[4]._id, status: 'accepted' }
        ],
        invitationCode: 'BETA002',
        maxMembers: 4,
        mentorPreferences: [
          { mentor: mentors[1]._id, rank: 1 },
          { mentor: mentors[2]._id, rank: 2 }
        ],
        status: 'formed',
        projectTitle: 'Campus Event Management System'
      },
      {
        name: 'Team Gamma',
        drive: drive._id,
        leader: students[5]._id,
        members: [],
        invitationCode: 'GAMMA003',
        maxMembers: 4,
        mentorPreferences: [
          { mentor: mentors[2]._id, rank: 1 }
        ],
        status: 'forming',
        projectTitle: 'Online Library Management'
      }
    ];
    const createdGroups = await Group.create(groups);
    console.log(`${createdGroups.length} sample groups created.`.green);
    console.log('\n' + '='.repeat(50));
    console.log('✅ Database seeded successfully!'.green.bold);
    console.log('='.repeat(50));
    console.log('\nSample Credentials:'.cyan.bold);
    console.log('\nAdmin:'.yellow);
    console.log('  Email: admin@campuscurator.com');
    console.log('  Password: admin123');
    console.log('\nMentor:'.yellow);
    console.log('  Email: john.smith@campuscurator.com');
    console.log('  Password: mentor123');
    console.log('\nStudent:'.yellow);
    console.log('  Email: alice.w@student.com');
    console.log('  Password: student123');
    console.log('\nDrive ID:'.yellow, drive._id);
    console.log('='.repeat(50) + '\n');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:'.red.bold, error);
    process.exit(1);
  }
};
const deleteData = async () => {
  try {
    await connectDB();
    console.log('Deleting all data...'.yellow);
    await User.deleteMany();
    await Drive.deleteMany();
    await Group.deleteMany();
    console.log('All data deleted.'.green.bold);
    process.exit(0);
  } catch (error) {
    console.error('Error deleting data:'.red.bold, error);
    process.exit(1);
  }
};
if (process.argv[2] === '-d') {
  deleteData();
} else {
  seedData();
}
