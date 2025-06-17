const jwt = require('jsonwebtoken');

const generateJWT = (uid) => {
  return new Promise((resolve, reject) => {
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      return reject(new Error('JWT_SECRET no está definido en las variables de entorno'));
    }

    const payload = { uid };

    jwt.sign(payload, secret, { expiresIn: '4h' }, (err, token) => {
      if (err) {
        reject(new Error('No se pudo generar el token: ' + err.message));
      } else {
        resolve(token);
      }
    });
  });
};



module.exports = { generateJWT };
