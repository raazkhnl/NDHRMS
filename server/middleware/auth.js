const jwt = require('jsonwebtoken');

module.exports = function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authorization token missing' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authorization token missing' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token has expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid authorization token' });
  }
};
