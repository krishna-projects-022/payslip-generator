const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'custq_super_secret_jwt_key_2026';

function verifyToken(req, res, next) {
  let token = null;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Access denied. Administrator role required.' });
  }
  next();
}

function requireEmployeeOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  if (req.user.role === 'admin' || req.user.role === 'employee') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied.' });
}

module.exports = {
  verifyToken,
  requireAdmin,
  requireEmployeeOrAdmin
};
