const User = require('../models/user');

const isAdminRole = (req, res, next) => {
  if (!req.user) {
    return res.status(500).json({
      message: 'Se quiere verificar el rol sin validar el token primero'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      message: 'No tienes permisos para realizar esta acción'
    });
  }

  next();
};
module.exports = { isAdminRole };

