const jwt = require('jsonwebtoken');

function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      department: user.department,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' },
  );
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing authorization token.' });
  }
  const token = header.slice(7);
  try {
    req.auth = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.auth || req.auth.role !== role) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return next();
  };
}

module.exports = {
  signToken,
  requireAuth,
  requireRole,
};
