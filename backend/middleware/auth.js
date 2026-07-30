// TibaMax HMIS - Shared authentication middleware
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  try {
    const decoded = jwt.verify(authHeader.split(' ')[1], process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
}

// Usage: router.post('/', verifyToken, requirePermission('patient.register'), handler)
// Must run AFTER verifyToken (needs req.user.permissions).
function requirePermission(permission) {
  return (req, res, next) => {
    const perms = req.user?.permissions || [];
    if (!perms.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: `Missing required permission: ${permission}`
      });
    }
    next();
  };
}

module.exports = { verifyToken, requirePermission };