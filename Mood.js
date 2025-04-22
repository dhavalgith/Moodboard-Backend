const mongoose = require('mongoose');

const moodSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    required: true
  },
  moodRating: {
    type: Number,
    required: true,
    min: 1,
    max: 5  // 1: Very sad, 5: Very happy
  },
  journal: {
    type: String,
    required: true,
    maxlength: 500
  },
  tags: {
    type: [String],
    default: []
  }
});

// Create a compound index to ensure one mood entry per user per day
moodSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Mood', moodSchema);