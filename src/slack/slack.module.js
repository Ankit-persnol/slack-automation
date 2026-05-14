const SlackController = require('./slack.controller');
const SlackService = require('./slack.service');

// Module configuration
class SlackModule {
  constructor(app) {
    this.app = app;
    this.controller = new SlackController();
    this.service = new SlackService();
  }

  /**
   * Initialize and register routes with the main Express app
   */
  init() {
    if (!this.app) {
      throw new Error('Express app instance is required');
    }

    // Register Slack routes
    this.app.use('/api/slack', this.controller.getRouter());

    console.log('Slack module initialized with routes:');
    console.log('  POST /api/slack/commands - Handle slash commands');
    console.log('  POST /api/slack/interactions - Handle button clicks');
    console.log('  GET /api/slack/health - Health check');

    return this;
  }

  /**
   * Get the Slack service instance
   */
  getService() {
    return this.service;
  }

  /**
   * Get the Slack controller instance
   */
  getController() {
    return this.controller;
  }
}

module.exports = SlackModule;
