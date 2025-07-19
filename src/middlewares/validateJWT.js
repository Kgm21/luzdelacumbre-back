const jwt = require('jsonwebtoken');
const User = require('../models/user');

const validateJWT = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ message: 'No hay token en la petición' });
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Payload del token:', payload);

    if (!payload.uid) {
      return res.status(401).json({ message: 'Token inválido: falta uid' });
    }

    const user = await User.findById(payload.uid);
    console.log('Usuario encontrado:', user);

    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    if (user.isActive !== undefined && !user.isActive) {
      return res.status(401).json({ message: 'Usuario inactivo' });
    }

    req.user = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    };

    console.log('req.user listo:', req.user);
    next();

  } catch (err) {
    console.error('Error en validación JWT:', err.name, err.message);
    return res.status(401).json({ message: 'Token no válido o expirado' });
  }
};

module.exports = { validateJWT };

