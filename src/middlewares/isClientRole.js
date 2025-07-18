const User = require('../models/user');

const isClientRole = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        message: 'Usuario no encontrado',
      });
    }

    if (user.role !== 'client') {
      return res.status(403).json({
        message: 'Acceso denegado: solo clientes pueden realizar esta acción',
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      message: 'Error al verificar el rol de cliente',
      error: error.message,
    });
  }
};

module.exports = { isClientRole };
