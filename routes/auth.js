const { Router } = require('express');
const { check } = require('express-validator');
const { login, register } = require('../controllers/authController');
const { validateFields } = require('../middlewares/validateFields');
const { isValidEmail } = require('../helpers/dbValidators');

const router = Router();

router.post('/login', [
  check('email', 'El correo es obligatorio').isEmail(),
  check('password', 'La contraseña es obligatoria').not().isEmpty(),
  validateFields,
], login);

router.post('/register', [
  check('name', 'El nombre es obligatorio').not().isEmpty(),
  check('email', 'El correo no es válido').isEmail(),
  check('email').custom(isValidEmail),
  check('password', 'La contraseña debe tener al menos 6 caracteres').isLength({ min: 6 }),
  check('role', 'El rol no es válido').optional().isIn(['admin', 'client']),
  validateFields,
], register);

module.exports = router;