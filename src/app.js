require('dotenv').config();
const express = require('express');
const SlackModule = require('./src/slack/slack.module');
const eventsService = require('./src/events/events.service');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize Slack Module
const slackModule = new SlackModule(app);
slackModule.init();

// Connect to MongoDB
eventsService
  .connectDB(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ Database connection established');
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Slack endpoints available at:`);
      console.log(`   POST http://localhost:${PORT}/api/slack/commands`);
      console.log(`   POST http://localhost:${PORT}/api/slack/interactions`);
      console.log(`   GET  http://localhost:${PORT}/api/slack/health`);
    });
  })
  .catch((error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    await require('mongoose').connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
});

module.exports = app;
