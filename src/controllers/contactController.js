// src/controllers/contactController.js
const mongoose = require('mongoose');
const Contact = require('../models/contact');
const nodemailer = require('nodemailer');

// Configurar el transporte de correo
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Crear un nuevo mensaje de contacto
const createContact = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'Nombre, email y mensaje son obligatorios' });
    }

    const newContact = new Contact({ name, email, phone, message });
    console.log('Guardando contacto:', newContact);
    await newContact.save();
    console.log('Contacto guardado');

    // Enviar correo de notificación
    const mailOptions = {
      from: `"Luz de la Cumbre" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: 'Nuevo mensaje de contacto',
      html: `
        <p><strong>Nombre:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Teléfono:</strong> ${phone || 'No proporcionado'}</p>
        <p><strong>Mensaje:</strong><br/>${message}</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('Email enviado');

    res.status(201).json({ message: 'Mensaje guardado y enviado por correo' });
  } catch (error) {
    console.error('Error en createContact:', error);
    res.status(500).json({ message: 'Error al guardar o enviar el mensaje', error: error.message });
  }
};

// Obtener todos los mensajes de contacto (con paginación para React Admin)
const getContact = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const messages = await Contact.find()
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    res.json({
      data: messages.map((msg) => ({ ...msg, id: msg._id.toString() })),
      total: await Contact.countDocuments(),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Error al obtener mensajes de contacto:', error);
    res.status(500).json({ message: 'Error al obtener los mensajes', error: error.message });
  }
};
// Eliminar un mensaje de contacto
const deleteContact = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    const deleted = await Contact.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ message: 'Mensaje no encontrado' });
    }

    res.json({ message: 'Mensaje eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar mensaje de contacto:', error);
    res.status(500).json({ message: 'Error al eliminar el mensaje', error: error.message });
  }
};


// Responder a un mensaje de contacto
const respondToContact = async (req, res) => {
  try {
    const { id } = req.params;
    const { response } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'ID inválido' });
    }

    if (!response || typeof response !== 'string' || response.trim() === '') {
      return res.status(400).json({ message: 'La respuesta es obligatoria' });
    }

    const message = await Contact.findById(id);
    if (!message) {
      return res.status(404).json({ message: 'Mensaje no encontrado' });
    }

    // Enviar correo electrónico con la respuesta
    const mailOptions = {
      from: `"Luz de la Cumbre" <${process.env.EMAIL_USER}>`,
      to: message.email,
      subject: 'Respuesta a tu mensaje - Luz de la Cumbre',
      text: `Hola ${message.name},\n\nGracias por contactarnos. Aquí está nuestra respuesta a tu mensaje:\n\n${response}\n\nSaludos,\nEquipo Luz de la Cumbre`,
    };

    await transporter.sendMail(mailOptions);

    // Actualizar el mensaje
    message.response = response.trim();
    message.status = 'responded';
    message.updatedAt = new Date();
    await message.save();

    res.json({
      message: 'Respuesta enviada correctamente',
      contactMessage: { ...message.toObject(), id: message._id.toString() },
    });
  } catch (error) {
    console.error('Error al responder mensaje de contacto:', error);
    res.status(500).json({ message: 'Error al responder el mensaje', error: error.message });
  }
};

module.exports = {
  createContact,
  getContact,
  respondToContact,
  deleteContact,
};