#!/usr/bin/env node

const MongoClient = require('mongodb').MongoClient;

const MONGO_URI = 'mongodb+srv://apiksha:Apiksha123@cluster0.g5xaa.mongodb.net/CampusCurator';

async function viewGroupsAndMentors() {
  const client = new MongoClient(MONGO_URI);
  
  try {
    await client.connect();
    const db = client.db('CampusCurator');
    
    console.log('\n' + '='.repeat(100));
    console.log('GROUP FORMATION & MENTOR ALLOTMENT VISUALIZATION');
    console.log('='.repeat(100));
    
    // Get all groups sorted by creation time
    const groups = await db.collection('groups')
      .find({})
      .sort({ createdAt: 1 })
      .toArray();
    
    // Get all users (for names)
    const users = await db.collection('users').find({}).toArray();
    const userMap = {};
    users.forEach(u => {
      userMap[u._id.toString()] = { name: u.name, email: u.email, role: u.role };
    });
    
    console.log(`\n Found ${groups.length} groups\n`);
    
    groups.forEach((group, idx) => {
      console.log(`\n${'─'.repeat(100)}`);
      console.log(`GROUP ${idx + 1}: ${group.name}`);
      console.log(`${'─'.repeat(100)}`);
      
      const createdDate = new Date(group.createdAt).toLocaleString();
      console.log(`   Created: ${createdDate}`);
      console.log(`   Status: ${group.status}`);
      
      console.log(`\n   👥 Members (${group.members?.length || 0}):`);
      if (group.members && group.members.length > 0) {
        group.members.forEach((memberId, i) => {
          const member = userMap[memberId.toString()];
          if (member) {
            console.log(`      ${i + 1}. ${member.name} (${member.email})`);
          }
        });
      }
      
      console.log(`\n   Mentor Preferences (in FIFO priority order)`);
      if (group.mentorPreferences && group.mentorPreferences.length > 0) {
        group.mentorPreferences
          .sort((a, b) => a.rank - b.rank)
          .forEach(pref => {
            const mentor = userMap[pref.mentor.toString()];
            const isAssigned = group.assignedMentor && 
                              group.assignedMentor.toString() === pref.mentor.toString();
            const marker = isAssigned ? '[ASSIGNED]' : '[WAITING]';
            if (mentor) {
              console.log(`      ${marker} -> Rank ${pref.rank}: ${mentor.name} (${mentor.email})`);
            }
          });
      }
      
      if (group.assignedMentor) {
        const mentor = userMap[group.assignedMentor.toString()];
        if (mentor) {
          console.log(`\n   FINAL ASSIGNMENT: ${mentor.name} (${mentor.email})`);
        }
      } else {
        console.log(`\n   AWAITING MENTOR ASSIGNMENT`);
      }
    });
    
    // Summary
    console.log(`\n\n${'='.repeat(100)}`);
    console.log('📊 MENTOR ALLOTMENT SUMMARY');
    console.log(`${'='.repeat(100)}`);
    
    const mentorGroups = {};
    groups.forEach(g => {
      if (g.assignedMentor) {
        const mentorId = g.assignedMentor.toString();
        if (!mentorGroups[mentorId]) {
          mentorGroups[mentorId] = [];
        }
        mentorGroups[mentorId].push(g.name);
      }
    });
    
    Object.entries(mentorGroups).forEach(([mentorId, groupList]) => {
      const mentor = userMap[mentorId];
      if (mentor) {
        console.log(`\n   📌 ${mentor.name} (${mentor.email}):`);
        console.log(`      Groups Assigned: ${groupList.join(', ')}`);
        console.log(`      Capacity Used: ${groupList.length}/3`);
      }
    });
    
    console.log(`\n\n${'='.repeat(100)}`);
    console.log('HOW FIFO MENTOR ALLOTMENT WORKS');
    console.log(`${'='.repeat(100)}`);
    console.log(`
1. GROUPS ARE SORTED BY CREATION TIME (createdAt)
   ↓
2. FOR EACH GROUP (in chronological order):
   • Check 1st preference mentor capacity (< 3 groups)
   • If available → ASSIGN immediately
   • If full → Check 2nd preference
   • If still full → Check 3rd preference
   ↓
3. RESULT: FAIR ALLOCATION
   Earlier groups get priority over later groups
   Preferences honored when possible
   No mentor exceeds capacity limit

EXAMPLE FROM THIS RUN:
   Group created at 08:00 -> 1st pref available -> [ASSIGNED]
   Group created at 08:15 -> 1st pref available -> [ASSIGNED]
   Group created at 08:30 -> 1st pref available -> [ASSIGNED]
`);
    console.log('='.repeat(100) + '\n');
    
    await client.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

viewGroupsAndMentors();
