module.exports = (requiredRoles) => {
  return (req, res, next) => {
    if (!requiredRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "Access denied: Role not allowed" });
    }
    next();
  };
};
