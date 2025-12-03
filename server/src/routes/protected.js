const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');

router.get('/dashboard', authenticateToken, (req, res) => {
  res.json({
    message: `Welcome ${req.user.email}, your role is ${req.user.role}`,
    user: {
      id: req.user.id,
      email: req.user.email,
      username: req.user.username,
      role: req.user.role,
    }
  });
});

module.exports = router;
