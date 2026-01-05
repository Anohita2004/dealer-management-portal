const jwt = require('jsonwebtoken');
require('dotenv').config();

const generateToken = (userId, role) => {
  const secret = process.env.JWT_SECRET || 'secret';
  const expiresIn = process.env.JWT_EXPIRE || '24h';
  
  if (!secret || secret === 'secret') {
    console.warn('⚠️  WARNING: Using default JWT_SECRET. Set JWT_SECRET in .env for production!');
  }
  
  return jwt.sign(
    { userId, role },
    secret,
    { expiresIn }
  );
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = { generateToken, verifyToken };
