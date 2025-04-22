const express = require('express');
const router = express.Router();
const Mood = require('../models/Mood');
const auth = require('../middleware/auth');
const axios = require('axios');

// Create or update a mood entry for today
router.post('/', auth, async (req, res) => {
  try {
    console.log('POST /api/moods request body:', req.body);
    const { moodRating, journal, tags } = req.body;

    // Input validation
    if (typeof moodRating !== 'number' || moodRating < 1 || moodRating > 5) {
      return res.status(400).json({ message: 'Invalid moodRating. Must be a number between 1 and 5.' });
    }
    if (typeof journal !== 'string' || journal.trim() === '' || journal.length > 500) {
      return res.status(400).json({ message: 'Journal is required and must be a non-empty string up to 500 characters.' });
    }
    if (tags && !Array.isArray(tags)) {
      return res.status(400).json({ message: 'Tags must be an array of strings.' });
    }

    // Set the date to the current day without time
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if entry already exists for today
    let moodEntry = await Mood.findOne({
      user: req.user.id,
      date: {
        $gte: today,
        $lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
      }
    });

    if (moodEntry) {
      // Update existing entry
      moodEntry.moodRating = moodRating;
      moodEntry.journal = journal;
      moodEntry.tags = tags;
    } else {
      // Create new entry
      moodEntry = new Mood({
        user: req.user.id,
        moodRating,
        journal,
        tags
      });
    }

    await moodEntry.save();
    console.log('Mood entry saved:', moodEntry);
    res.json(moodEntry);
  } catch (err) {
    console.error(err.stack);
    res.status(500).send('Server error');
  }
});

// Get all mood entries for the logged-in user
router.get('/', auth, async (req, res) => {
  try {
    const moods = await Mood.find({ user: req.user.id }).sort({ date: -1 });
    console.log('Moods fetched:', moods);
    res.json(moods);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get mood entries within a date range
router.get('/range', auth, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const moods = await Mood.find({
      user: req.user.id,
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).sort({ date: 1 });
    
    res.json(moods);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get a single mood entry by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const mood = await Mood.findById(req.params.id);
    
    // Check if mood exists and belongs to user
    if (!mood) {
      return res.status(404).json({ message: 'Mood entry not found' });
    }
    
    if (mood.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    
    res.json(mood);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Delete a mood entry
router.delete('/:id', auth, async (req, res) => {
  try {
    const mood = await Mood.findById(req.params.id);
    
    // Check if mood exists and belongs to user
    if (!mood) {
      return res.status(404).json({ message: 'Mood entry not found' });
    }
    
    if (mood.user.toString() !== req.user.id) {
      return res.status(401).json({ message: 'User not authorized' });
    }
    
    await mood.remove();
    res.json({ message: 'Mood entry removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Get a motivational quote based on mood
router.get('/quote/:moodRating', auth, async (req, res) => {
  try {
    const moodRating = parseInt(req.params.moodRating);
    let category = 'inspirational';

    // Adjust category based on mood
    if (moodRating <= 2) {
      category = 'motivational';
    }

    // We'll use a free quotes API for this example
    const response = await axios.get(`https://api.quotable.io/random?tags=${category}`);
    res.json(response.data);
  } catch (err) {
    console.error('Quote API error:', err.stack);
    res.status(500).json({ message: 'Failed to fetch quote' });
  }
});

// Get a GIF based on mood
router.get('/gif/:moodRating', auth, async (req, res) => {
  try {
    const moodRating = parseInt(req.params.moodRating);
    let searchTerm = 'happy';

    // Adjust search term based on mood
    if (moodRating === 1) {
      searchTerm = 'cheer up';
    } else if (moodRating === 2) {
      searchTerm = 'smile';
    } else if (moodRating === 3) {
      searchTerm = 'content';
    } else if (moodRating === 4) {
      searchTerm = 'happy';
    } else if (moodRating === 5) {
      searchTerm = 'excited';
    }

    const response = await axios.get(`https://api.giphy.com/v1/gifs/random`, {
      params: {
        api_key: process.env.GIPHY_API_KEY,
        tag: searchTerm,
        rating: 'g'
      }
    });

    res.json(response.data);
  } catch (err) {
    console.error('Giphy API error:', err.stack);
    res.status(500).json({ message: 'Failed to fetch GIF' });
  }
});

module.exports = router;