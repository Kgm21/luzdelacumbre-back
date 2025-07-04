const { Router } = require('express');
const { check } = require('express-validator');
const { login, register } = require('../controllers/authController');
const { validateFields } = require('../middlewares/validateFields');
const { isValidEmail } = require('../helpers/dbValidators');
const { validateJWT } = require('../middlewares/validateJWT');

const router = Router();

router.post('/login', [
  check('email', 'El correo es obligatorio').isEmail(),
  check('password', 'La contraseña es obligatoria').not().isEmpty(),
  validateFields,
], login);

router.post('/register', [
  check('name', 'El nombre es obligatorio').not().isEmpty(),
  check('apellido', 'El apellido es obligatorio').not().isEmpty(),
  check('email', 'El correo no es válido').isEmail(),
  check('email').custom(isValidEmail),
  check('password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 }),
  check('role', 'El rol no es válido').optional().isIn(['admin', 'client']),
  validateFields,
], register);

// ✅ NUEVA RUTA
router.get('/validate-token', validateJWT, (req, res) => {
  res.json({
    ok: true,
    message: 'Token válido',
    user: req.user,
  });
});

module.exports = router;
