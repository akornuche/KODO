const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

router.get('/dashboard', authenticateToken, (req, res) => {
  res.json({
    msg: `Welcome ${req.user.email}, your role is ${req.user.role}`,
    user: req.user
  });
});

module.exports = router;
