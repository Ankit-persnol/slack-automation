const mongoose = require('mongoose');
const Fuse = require('fuse.js');
const Event = require('./events.schema');

// Dummy JSON data for testing (when MongoDB is disabled)
const DUMMY_EVENTS = [
  {
    _id: '1',
    name: 'React India Summit 2026',
    url: 'https://reactindia.io',
    description: 'The biggest React conference in India',
    date: '2026-03-15'
  },
  {
    _id: '2',
    name: 'Node.js Conference 2025',
    url: 'https://nodejsconf.io',
    description: 'Annual Node.js conference',
    date: '2025-11-20'
  },
  {
    _id: '3',
    name: 'JavaScript Summit',
    url: 'https://jssummit.com',
    description: 'Global JavaScript developers summit',
    date: '2025-12-10'
  },
  {
    _id: '4',
    name: 'TechCrunch Disrupt',
    url: 'https://techcrunch.com/disrupt',
    description: 'Startup and technology conference',
    date: '2025-10-05'
  },
  {
    _id: '5',
    name: 'AWS re:Invent',
    url: 'https://reinvent.awsevents.com',
    description: 'Amazon Web Services annual conference',
    date: '2025-11-30'
  }
];

class EventsService {
  constructor() {
    this.eventModel = Event;
    // Set to true to use dummy JSON data, false to use MongoDB
    this.useDummyData = process.env.USE_DUMMY_DATA === 'true';
    console.log(`Using ${this.useDummyData ? 'DUMMY JSON DATA' : 'MongoDB'} for event storage`);
  }
  
  async connectDB(uri) {
    if (this.useDummyData) {
      console.log('Skipping MongoDB connection - using dummy data');
      return;
    }
    
    try {
      await mongoose.connect(uri || process.env.MONGODB_URI);
      console.log('MongoDB connected successfully');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  // Helper to convert dummy data to expected format
  _getDummyEvents() {
    return DUMMY_EVENTS.map(event => ({
      ...event,
      _id: { toString: () => event._id },
      toJSON: () => event
    }));
  }

  // Better search using Fuse.js for fuzzy matching
  async searchEvents(query, options = {}) {
    const { limit = 10, threshold = 0.5 } = options;

    if (!query || query.trim() === '') {
      return [];
    }

    // Use dummy data if enabled
    if (this.useDummyData) {
      const fuse = new Fuse(this._getDummyEvents(), {
        keys: [
          { name: 'name', weight: 0.7 },
          { name: 'url', weight: 0.3 }
        ],
        threshold: threshold,
        includeScore: true,
        minMatchCharLength: 2,
        findAllMatches: true,
        ignoreLocation: true
      });

      const results = fuse.search(query).slice(0, limit);
      return results.map(result => result.item);
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
      return null;
    }

    // Use dummy data if enabled
    if (this.useDummyData) {
      const found = DUMMY_EVENTS.find(event => 
        event.name.toLowerCase().includes(query.toLowerCase()) ||
        event.url === query
      );
      
      if (found) {
        return {
          ...found,
          _id: { toString: () => found._id }
        };
      }
      return null;
    }

    return await this.eventModel.findOne({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { url: query }
      ]
    });
  }

  async getEventById(id) {
    if (this.useDummyData) {
      const found = DUMMY_EVENTS.find(event => event._id === id);
      if (found) {
        return {
          ...found,
          _id: { toString: () => found._id }
        };
      }
      return null;
    }
    
    return await this.eventModel.findById(id);
  }

  async deleteEvent(id) {
    if (this.useDummyData) {
      const index = DUMMY_EVENTS.findIndex(event => event._id === id);
      if (index !== -1) {
        DUMMY_EVENTS.splice(index, 1);
        return { deletedCount: 1 };
      }
      return { deletedCount: 0 };
    }
    
    return await this.eventModel.deleteOne({ _id: id });
  }

  async createEvent(eventData) {
    if (this.useDummyData) {
      const newEvent = {
        _id: String(Date.now()),
        ...eventData
      };
      DUMMY_EVENTS.push(newEvent);
      return {
        ...newEvent,
        _id: { toString: () => newEvent._id }
      };
    }
    
    const event = new this.eventModel(eventData);
    return await event.save();
  }

  async getAllEvents(limit = 50) {
    if (this.useDummyData) {
      return this._getDummyEvents().slice(0, limit);
    }
    
    return await this.eventModel.find().limit(limit);
  }
}

module.exports = new EventsService();
