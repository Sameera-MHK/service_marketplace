export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, data: null, message: 'Forbidden: insufficient role' });
    }
    next();
  };
}
