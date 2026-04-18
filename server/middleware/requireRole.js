// Guards a route by required role. Must be chained AFTER auth middleware.
// Usage: router.get('/path', auth, requireRole('ministry-secretary'), handler)
module.exports = function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const userRoles = req.user.roles || [];
    const hasRole = allowedRoles.some((r) => userRoles.includes(r));
    if (!hasRole) {
      return res.status(403).json({
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}`
      });
    }
    next();
  };
};
