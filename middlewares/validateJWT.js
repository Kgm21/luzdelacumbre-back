const jwt = require('jsonwebtoken');

const validateJWT = (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      message: 'No hay token en la petición',
    });
  }

  const token = authHeader.split(' ')[1]; 

  try {
    const { uid } = jwt.verify(token, process.env.JWT_SECRET);
    req.uid = uid;
    next();
  } catch (error) {
    return res.status(401).json({
      message: 'Token no válido',
    });
  }
};

module.exports = { validateJWT };
