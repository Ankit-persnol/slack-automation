require('dotenv').config();
const mongoose = require('mongoose');
const Event = require('../src/events/events.schema');

// Sample events data for testing (same as dummy data)
const sampleEvents = [
  {
    name: 'React India Summit 2026',
    url: 'https://reactindia.io',
    description: 'The biggest React conference in India',
    date: new Date('2026-10-15')
  },
  {
    name: 'Node.js Conference 2025',
    url: 'https://nodejsconf.io',
    description: 'Annual Node.js conference',
    date: new Date('2025-11-20')
  },
  {
    name: 'JavaScript Summit',
    url: 'https://jssummit.com',
    description: 'Global JavaScript developers summit',
    date: new Date('2025-12-10')
  },
  {
    name: 'TechCrunch Disrupt',
    url: 'https://techcrunch.com/disrupt',
    description: 'Startup and technology conference',
    date: new Date('2025-10-05')
  },
  {
    name: 'AWS re:Invent',
    url: 'https://reinvent.awsevents.com',
    description: 'Amazon Web Services annual conference',
    date: new Date('2025-11-30')
  }
];

async function seedDatabase() {
  // Check if using dummy data mode
  if (process.env.USE_DUMMY_DATA === 'true') {
    console.log('⚠️  USE_DUMMY_DATA is set to true.');
    console.log('   Dummy JSON data is already available in-memory.');
    console.log('   No need to seed the database.\n');
    console.log('To use MongoDB instead:');
    console.log('   1. Set USE_DUMMY_DATA=false in your .env file');
    console.log('   2. Ensure MongoDB is running');
    console.log('   3. Run npm run seed again\n');
    process.exit(0);
  }

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/slack_automation';
    
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Clear existing events
    console.log('Clearing existing events...');
    await Event.deleteMany({});
    console.log('✅ Existing events cleared');

    // Insert sample events
    console.log('Inserting sample events...');
    const inserted = await Event.insertMany(sampleEvents);
    console.log(`✅ Inserted ${inserted.length} sample events`);

    inserted.forEach(event => {
      console.log(`   - ${event.name}`);
    });

    console.log('\n🎉 Database seeded successfully!');
    console.log('\nYou can now test the search with:');
    console.log('  - "react summit" (will find "React India Summit 2026")');
    console.log('  - "node" (will find "Node.js Conference 2025")');
    console.log('  - "javascript" (will find "JavaScript Summit")');
    
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
