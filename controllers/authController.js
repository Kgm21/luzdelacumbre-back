const bcrypt = require('bcryptjs');
const User = require('../models/user');
const { generateJWT } = require('../helpers/generateJWT');

const login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !user.isActive) {
      return res.status(400).json({
        message: 'Correo o contraseña incorrectos',
      });
    }

    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(400).json({
        message: 'Correo o contraseña incorrectos',
      });
    }

    const token = await generateJWT(user.id);
    res.json({
      message: 'Inicio de sesión exitoso',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al iniciar sesión',
      error: error.message,
    });
  }
};

const register = async (req, res) => {
  const { name, email, password, role = 'client' } = req.body;
  try {
    const user = new User({ name, email, password, role });
    const salt = bcrypt.genSaltSync();
    user.password = bcrypt.hashSync(password, salt);
    await user.save();

    const token = await generateJWT(user.id);
    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      token,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Error al registrar usuario',
      error: error.message,
    });
  }
};

module.exports = { login, register };