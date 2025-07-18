const jwt = require('jsonwebtoken');
const User = require('../models/user');

const validateJWT = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'No hay token en la petición' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token payload:', payload);

    const user = await User.findById(payload.uid);
    console.log('User found:', user);

    if (!user || (user.isActive !== undefined && !user.isActive)) {
      return res.status(401).json({ message: 'Usuario no válido o inactivo' });
    }

    req.user = {
      uid: payload.uid,
      role: user.role || null
    };

    next();
  } catch (err) {
    console.error('JWT error:', err.name, err.message);
    return res.status(401).json({ message: 'Token no válido o expirado' });
  }
};

module.exports = { validateJWT };
