const User = require('../models/user');

const isAdminRole = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id); // Usa req.usuario._id
    if (!user) {
      return res.status(404).json({
        message: 'Usuario no encontrado',
      });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({
        message: 'No tienes permisos para realizar esta acción',
      });
    }
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({
      message: 'Error al verificar el rol',
      error: error.message,
    });
  }
};
module.exports = { isAdminRole };