const mongoose = require('mongoose');
const Fuse = require('fuse.js');
const Event = require('./events.schema');

class EventsService {
  constructor() {
    this.eventModel = Event;
  }

  async connectDB(uri) {
    try {
      await mongoose.connect(uri || process.env.MONGODB_URI);
      console.log('MongoDB connected successfully');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  // Better search using Fuse.js for fuzzy matching
  async searchEvents(query, options = {}) {
    const { limit = 10, threshold = 0.4 } = options;

    if (!query || query.trim() === '') {
      return [];
    }

    // First try MongoDB text search if available
    try {
      const mongoResults = await this.eventModel.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(limit);

      if (mongoResults.length > 0) {
        return mongoResults;
      }
    } catch (error) {
      console.log('MongoDB text search not available, using Fuse.js');
    }

    // Fallback to Fuse.js for fuzzy search
    const allEvents = await this.eventModel.find().limit(100);
    
    const fuse = new Fuse(allEvents, {
      keys: ['name', 'url'],
      threshold: threshold,
      includeScore: true,
      minMatchCharLength: 2
    });

    const results = fuse.search(query).slice(0, limit);
    return results.map(result => result.item);
  }

  // Legacy regex search (for backward compatibility)
  async searchEventsRegex(query) {
    if (!query || query.trim() === '') {
      return [];
    }

    return await this.eventModel.findOne({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { url: query }
      ]
    });
  }

  async getEventById(id) {
    return await this.eventModel.findById(id);
  }

  async deleteEvent(id) {
    return await this.eventModel.deleteOne({ _id: id });
  }

  async createEvent(eventData) {
    const event = new this.eventModel(eventData);
    return await event.save();
  }

  async getAllEvents(limit = 50) {
    return await this.eventModel.find().limit(limit);
  }
}

module.exports = new EventsService();
