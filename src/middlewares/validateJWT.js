const jwt = require('jsonwebtoken');
const Usuario = require('../models/user');

const validateJWT = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No hay token en la petición' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { uid } = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = await Usuario.findById(uid);
    if (!usuario || !usuario.isActive) {
      return res.status(401).json({ message: 'Token no válido - usuario no existe o está desactivado' });
    }

    req.user = {
      _id: usuario._id,
      role: usuario.role,
      name: usuario.name,
      email: usuario.email
    };

    console.log('Usuario autenticado:', req.user);

    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token no válido' });
  }
};

module.exports = { validateJWT };

