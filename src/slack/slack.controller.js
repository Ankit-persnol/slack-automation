const express = require('express');
const bodyParser = require('body-parser');
const SlackService = require('./slack.service');
const eventsService = require('../events/events.service');

class SlackController {
  constructor() {
    this.router = express.Router();
    this.slackService = new SlackService();
    this.setupRoutes();
  }

  setupRoutes() {
    // Slack slash commands endpoint
    // Content type: application/x-www-form-urlencoded
    this.router.post(
      '/commands',
      bodyParser.urlencoded({ extended: true }),
      (req, res) => this.handleCommand(req, res)
    );

    // Slack interactions endpoint (button clicks, etc.)
    // Content type: application/x-www-form-urlencoded
    this.router.post(
      '/interactions',
      bodyParser.urlencoded({ extended: true }),
      (req, res) => this.handleInteraction(req, res)
    );

    // Health check endpoint
    this.router.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'slack-controller' });
    });
  }

  /**
   * Handle Slack Slash Command
   * POST /commands
   */
  async handleCommand(req, res) {
    try {
      // Verify Slack signature for security
      const rawBody = req.body;
      const headers = req.headers;
      
      // Only verify in production when signing secret is set
      if (process.env.SLACK_SIGNING_SECRET) {
        try {
          this.slackService.verifySlackSignature(headers, rawBody);
        } catch (error) {
          console.error('Signature verification failed:', error.message);
          return res.status(401).json({ error: 'Invalid signature' });
        }
      }

      const text = req.body.text || '';
      const command = req.body.command || '';

      console.log(`Received command: ${command}, text: ${text}`);

      // Process the delete command
      const response = await this.slackService.processDeleteCommand(text);

      // Send response back to Slack
      res.json(response);
    } catch (error) {
      console.error('Error handling command:', error);
      res.status(500).json({
        text: '❌ An error occurred while processing your request',
        response_type: 'ephemeral'
      });
    }
  }

  /**
   * Handle Slack Interactions (Button Clicks)
   * POST /interactions
   */
  async handleInteraction(req, res) {
    try {
      // Verify Slack signature for security
      const headers = req.headers;
      
      // The payload comes as a form field named 'payload'
      const payloadString = req.body.payload;
      
      if (!payloadString) {
        return res.status(400).json({ error: 'Missing payload' });
      }

      // Only verify in production when signing secret is set
      if (process.env.SLACK_SIGNING_SECRET) {
        try {
          this.slackService.verifySlackSignature(headers, payloadString);
        } catch (error) {
          console.error('Signature verification failed:', error.message);
          return res.status(401).json({ error: 'Invalid signature' });
        }
      }

      // Parse the payload JSON
      const payload = JSON.parse(payloadString);
      
      console.log('Received interaction:', JSON.stringify(payload, null, 2));

      // Handle the interaction
      const response = await this.slackService.handleInteraction(payload);

      // Send response back to Slack
      res.json(response);
    } catch (error) {
      console.error('Error handling interaction:', error);
      res.status(500).json({
        text: '❌ An error occurred while processing your interaction',
        response_type: 'ephemeral'
      });
    }
  }

  getRouter() {
    return this.router;
  }
}

module.exports = SlackController;
