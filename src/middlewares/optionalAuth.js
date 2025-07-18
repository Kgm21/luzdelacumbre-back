const jwt = require('jsonwebtoken');
const User = require('../models/user');

const optionalAuth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  console.log('Token recibido:', token); // <-- para debug
  if (!token) {
    // No hay token, seguimos sin autenticar
    return next();     
  }

  try {
    const { uid } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(uid);
    if (!user) {
      // Si no se encuentra usuario, igual seguimos (no auth)
      return next();
    }
    req.user = user; // Agregamos usuario al req para el controlador
    next();
  } catch (error) {
    // Token inválido o error, seguimos sin autenticar
    next();
  }
};

module.exports = { optionalAuth };
