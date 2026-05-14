const crypto = require('crypto');
const eventsService = require('../events/events.service');

class SlackService {
  constructor(signingSecret) {
    this.signingSecret = signingSecret || process.env.SLACK_SIGNING_SECRET;
    this.eventModel = eventsService.eventModel;
  }

  /**
   * Verify Slack request signature
   * Slack sends: x-slack-signature, x-slack-request-timestamp
   */
  verifySlackSignature(headers, body) {
    const signature = headers['x-slack-signature'];
    const timestamp = headers['x-slack-request-timestamp'];
    
    if (!signature || !timestamp) {
      throw new Error('Missing Slack signature headers');
    }

    // Check if timestamp is too old (prevent replay attacks)
    const now = Math.floor(Date.now() / 1000);
    const fiveMinutesAgo = now - 300; // 5 minutes
    
    if (parseInt(timestamp) < fiveMinutesAgo) {
      throw new Error('Slack request timestamp is too old');
    }

    // Create the signature base string
    const version = 'v0';
    const bodyString = typeof body === 'string' ? body : JSON.stringify(body);
    const sigBaseString = `${version}:${timestamp}:${bodyString}`;

    // Generate the HMAC hash
    const hash = crypto
      .createHmac('sha256', this.signingSecret)
      .update(sigBaseString, 'utf8')
      .digest('hex');

    const generatedSignature = `${version}=${hash}`;

    // Compare signatures securely
    if (!crypto.timingSafeEqual(
      Buffer.from(signature, 'utf8'),
      Buffer.from(generatedSignature, 'utf8')
    )) {
      throw new Error('Invalid Slack signature');
    }

    return true;
  }

  /**
   * Process delete command from Slack slash command
   * Searches for event and returns confirmation buttons
   */
  async processDeleteCommand(query) {
    if (!query || query.trim() === '') {
      return {
        text: '❌ Please provide an event name or URL to search',
        response_type: 'ephemeral'
      };
    }

    // Use fuzzy search for better results
    const events = await eventsService.searchEvents(query, { limit: 1 });
    
    if (!events || events.length === 0) {
      // Try legacy regex search as fallback
      const legacyEvent = await eventsService.searchEventsRegex(query);
      if (!legacyEvent) {
        return {
          text: `❌ No event found matching "${query}"`,
          response_type: 'ephemeral'
        };
      }
      return this.buildEventFoundResponse(legacyEvent);
    }

    return this.buildEventFoundResponse(events[0]);
  }

  /**
   * Build the response with event details and YES/NO buttons
   */
  buildEventFoundResponse(event) {
    return {
      response_type: 'ephemeral',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*🔍 Event Found*\n*Name:* ${event.name}\n*URL:* ${event.url || 'N/A'}\n*Description:* ${event.description || 'No description'}`
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Are you sure you want to delete this event?*'
          }
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '✅ YES DELETE'
              },
              style: 'danger',
              value: event._id.toString(),
              action_id: 'confirm_delete'
            },
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '❌ NO'
              },
              style: 'primary',
              value: 'cancel',
              action_id: 'cancel_delete'
            }
          ]
        }
      ]
    };
  }

  /**
   * Handle button click interactions
   */
  async handleInteraction(payload) {
    const action = payload.actions?.[0];
    
    if (!action) {
      return {
        text: '❌ Invalid interaction',
        response_type: 'ephemeral'
      };
    }

    switch (action.action_id) {
      case 'confirm_delete':
        return await this.handleConfirmDelete(action.value, payload);
      
      case 'cancel_delete':
        return {
          text: '❌ Deletion cancelled',
          response_type: 'ephemeral'
        };
      
      default:
        return {
          text: '❌ Unknown action',
          response_type: 'ephemeral'
        };
    }
  }

  /**
   * Handle confirm delete action
   */
  async handleConfirmDelete(eventId, payload) {
    try {
      // Get event first to show in response
      const event = await eventsService.getEventById(eventId);
      
      if (!event) {
        return {
          text: '❌ Event not found (may have been deleted already)',
          response_type: 'ephemeral'
        };
      }

      // Delete the event
      await eventsService.deleteEvent(eventId);

      return {
        text: `✅ Event "*${event.name}*" deleted successfully!`,
        response_type: 'ephemeral'
      };
    } catch (error) {
      console.error('Error deleting event:', error);
      return {
        text: '❌ Error deleting event. Please try again.',
        response_type: 'ephemeral'
      };
    }
  }

  /**
   * Send a message to a Slack channel
   */
  async sendMessageToChannel(token, channelId, message) {
    const { WebClient } = require('@slack/web-api');
    const web = new WebClient(token);

    try {
      const result = await web.chat.postMessage({
        channel: channelId,
        text: message
      });
      return result;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Update a message in Slack
   */
  async updateMessage(token, channelId, ts, message) {
    const { WebClient } = require('@slack/web-api');
    const web = new WebClient(token);

    try {
      const result = await web.chat.update({
        channel: channelId,
        ts: ts,
        text: message
      });
      return result;
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }
}

module.exports = SlackService;
