const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create text index for better search
eventSchema.index({ name: 'text', url: 'text' });

module.exports = mongoose.model('Event', eventSchema);
