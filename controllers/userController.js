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
    console.log('Datos recibidos de req.body:', req.body); // Log inicial
    const datos = req.body;
    const { name, apellido, email, password, role } = datos;

    // Validaciones
    console.log('Validando name:', name); // Log antes de validar name
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ mensaje: 'Nombre inválido' });
    }
    console.log('Validando apellido:', apellido); // Log antes de validar apellido
    if (!apellido || typeof apellido !== 'string' || apellido.trim() === '') {
      return res.status(400).json({ mensaje: 'Apellido inválido' });
    }
    console.log('Validando email:', email); // Log antes de validar email
    if (!email || !email.includes('@')) {
      return res.status(400).json({ mensaje: 'Correo inválido' });
    }
    console.log('Validando password:', password); // Log antes de validar password
    if (!password || password.length < 6) {
      return res.status(400).json({ mensaje: 'Contraseña debe tener al menos 6 caracteres' });
    }

    // Verificar si el correo ya existe
    const existeCorreo = await Usuario.findOne({ email });
    if (existeCorreo) {
      return res.status(400).json({ mensaje: 'El correo ya está registrado' });
    }

    // Encriptar la contraseña
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);

    // Asignar rol
    let rolAsignado;
    if (req.user?.rol === 'admin') {
      if (!['admin', 'client'].includes(role)) {
        return res.status(400).json({ mensaje: 'Rol inválido' });
      }
      rolAsignado = role;
    } else {
      rolAsignado = 'client';
    }

    // Crear el usuario y loguear antes de guardar
    const usuario = new Usuario({ name, apellido, email, password: hash, role: rolAsignado });
    console.log('Usuario a guardar antes de save:', usuario.toObject()); // Log detallado
    console.log('Validación del modelo:', usuario.validateSync()); // Forzar validación manual

    // Guardar en la base de datos
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
  try {
    const { id } = req.params;
    const { password, email, name, ...resto } = req.body; // Alineado con el modelo (email en lugar de correo)

    // Validaciones solo si vienen los campos
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ mensaje: 'Nombre inválido' });
      }
      resto.name = name.trim();
    }

    if (email !== undefined) {
      if (typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ mensaje: 'Correo inválido' });
      }
    }

    if (password !== undefined) {
      if (typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ mensaje: 'Contraseña debe tener al menos 6 caracteres' });
      }
    }

    const usuarioExistente = await Usuario.findById(id);
    if (!usuarioExistente || !usuarioExistente.estado) {
      return res.status(404).json({ mensaje: "Usuario no encontrado" });
    }

    // Validar y actualizar email si fue enviado y es diferente
    if (email && email !== usuarioExistente.email) {
      const emailRepetido = await Usuario.findOne({ email });
      if (emailRepetido) {
        return res.status(400).json({ mensaje: "Ese correo ya está registrado por otro usuario" });
      }
      resto.email = email;
    }

    // Validar y encriptar contraseña si fue enviada
    if (password) {
      const salt = bcrypt.genSaltSync(10);
      resto.password = bcrypt.hashSync(password, salt);
    }

    const usuario = await Usuario.findByIdAndUpdate(id, resto, { new: true });

    res.json({
      mensaje: "Usuario actualizado correctamente",
      usuario
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error.stack);
    res.status(400).json({
      mensaje: "Error al actualizar el usuario",
      error: error.message
    });
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