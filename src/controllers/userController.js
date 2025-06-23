const { response, request } = require('express');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/user');
const mongoose = require('mongoose');


const usuarioGet = async (req = request, res = response) => {
  let { desde = 0, limite = 5 } = req.query;

  desde = Number(desde);
  limite = Number(limite);
  if (isNaN(desde) || desde < 0) desde = 0;
  if (isNaN(limite) || limite < 1) limite = 5;

  const query = { isActive: true }; // ✅ campo correcto según el modelo

  const [total, usuarios] = await Promise.all([
    Usuario.countDocuments(query),
    Usuario.find(query).skip(desde).limit(limite)
  ]);

  res.json({
    mensaje: "Usuarios obtenidos",
    total,
    usuarios
  });
};

const usuarioGetID = async (req = request, res = response) => {
  try {
    const { id } = req.params;

    // Validar que el id sea válido
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        mensaje: "Id inválido"
      });
    }

    const usuario = await Usuario.findById(id);

    if (!usuario || !usuario.isActive) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado o inactivo"
      });
    }

    res.json({
      mensaje: "Usuario obtenido",
      usuario
    });
  } catch (error) {
    res.status(500).json({
      mensaje: "Error del servidor",
      error: error.message
    });
  }
};



const usuarioPost = async (req = request, res = response) => {
  try {
    console.log('Datos recibidos de req.body:', req.body);
    const datos = req.body;
    let { name, apellido, email, password } = datos;

    // Asignar rol seguro
    const rolesPermitidos = ['admin', 'client'];
    let rolAsignado = 'client';

    if (req.user?.role === 'admin' && rolesPermitidos.includes(datos.role)) {
      rolAsignado = datos.role;
    } 


    // Validaciones
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ mensaje: 'Nombre inválido' });
    }

    if (!apellido || typeof apellido !== 'string' || apellido.trim() === '') {
      return res.status(400).json({ mensaje: 'Apellido inválido' });
    }

    if (!email || !email.includes('@')) {
      return res.status(400).json({ mensaje: 'Correo inválido' });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({ mensaje: 'Contraseña debe tener al menos 6 caracteres' });
    }

    const existeCorreo = await Usuario.findOne({ email });
    if (existeCorreo) {
      return res.status(400).json({ mensaje: 'El correo ya está registrado' });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    // Crear el usuario
    const usuario = new Usuario({ name, apellido, email, password: hash, role: rolAsignado });

    await usuario.save();

    res.status(201).json({
      mensaje: 'Usuario cargado correctamente',
      usuario
    });

  } catch (error) {
    console.error('Error al crear usuario:', error.stack);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        mensaje: 'Error de validación',
        error: error.message
      });
    }

    if (error.code === 11000) {
      return res.status(400).json({ mensaje: 'El correo ya está registrado' });
    }

    res.status(500).json({
      mensaje: 'Error interno del servidor al crear el usuario',
      error: error.message
    });
  }
};

const usuarioPut = async (req = request, res = response) => {
  const { id } = req.params;
  const { password, google, _id, role, ...resto } = req.body;

  // Solo el admin puede modificar el rol
  if (req.usuario._id.toString() !== id && req.usuario.role !== 'admin') {
    return res.status(403).json({ mensaje: 'No tienes permiso para actualizar este perfil' });
  }

  // Si no es admin, eliminar cualquier intento de modificar el rol
  if (req.usuario.role !== 'admin') {
    delete resto.role;
  } else {
    // Si es admin, permitimos cambiar el rol si lo envía
    if (role) resto.role = role;
  }

  // Opcional: actualizar contraseña si se proporciona
  if (password) {
    const salt = bcrypt.genSaltSync();
    resto.password = bcrypt.hashSync(password, salt);
  }

  try {
    const usuarioActualizado = await Usuario.findByIdAndUpdate(id, resto, { new: true });
    res.json({ usuarioActualizado });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al actualizar usuario' });
  }
};





const usuarioDelete = async (req = request, res = response) => {
  const { id } = req.params;

  try {
    const usuario = await Usuario.findById(id);

  
    if (!usuario) {
      return res.status(404).json({
        mensaje: "Usuario no encontrado"
      });
    }

  
    if (!usuario.isActive) {
      return res.status(400).json({
        mensaje: "El usuario ya está inhabilitado"
      });
    }

 
    const usuarioInhabilitado = await Usuario.findByIdAndUpdate(id, { isActive: false }, { new: true });

    res.json({
      mensaje: "Usuario inhabilitado correctamente",
      usuario: usuarioInhabilitado
    });

  } catch (error) {
    res.status(500).json({
      mensaje: "Error al inhabilitar el usuario",
      error: error.message
    });
  }
};


module.exports = {
  usuarioGet,
  usuarioGetID,
  usuarioPost,
  usuarioPut,
  usuarioDelete
}