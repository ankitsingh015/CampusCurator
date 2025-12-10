const express = require('express');
const { protect } = require('../middleware/auth');
const { getResults } = require('../controllers/resultsController');

const router = express.Router();

// Student/mentor/admin: fetch published results for relevant groups
router.get('/', protect, getResults);

module.exports = router;
