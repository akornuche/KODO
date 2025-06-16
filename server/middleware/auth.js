const jwt = require('jsonwebtoken');
const SECRET = 'your-secret-key'; // Make sure this matches the one used in login

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) return res.status(401).json({ msg: 'No token, access denied' });

  jwt.verify(token, SECRET, (err, user) => {
    if (err) return res.status(403).json({ msg: 'Invalid token' });
    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
