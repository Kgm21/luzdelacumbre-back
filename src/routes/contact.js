const express = require('express');
const router = express.Router();
const Contact = require('../models/contact');
 const { deleteContact } = require('../controllers/contactController');

// POST /api/contact
router.post('/', async (req, res) => {
  try {
    const contact = new Contact(req.body);
    await contact.save();
    res.status(201).json({ message: 'Mensaje enviado correctamente.' });
  } catch (error) {
    console.error(error);
    res.status(400).json({ message: 'Error al enviar el mensaje.' });
  }
});

// GET /api/contact
router.get('/', async (req, res) => {
  try {
    const messages = await Contact.find().sort({ createdAt: -1 });
    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener los mensajes.' });
  }
});

// PUT /api/contact/:id
router.put('/:id', async (req, res) => {
  try {
    const { response } = req.body;
    const updatedMessage = await Contact.findByIdAndUpdate(
      req.params.id,
      {
        response,
        status: 'responded',
        updatedAt: Date.now(),
      },
      { new: true }
    );
    if (!updatedMessage) {
      return res.status(404).json({ message: 'Mensaje no encontrado.' });
    }
    res.json({ message: 'Respuesta registrada correctamente.', data: updatedMessage });
  } catch (error) {
    res.status(500).json({ message: 'Error al responder el mensaje.' });
  }
});

// DELETE /api/contact/:id 👈 este es nuevo
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Contact.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ message: 'Mensaje no encontrado.' });
    }
    res.json({ message: 'Mensaje eliminado correctamente.' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el mensaje.' });
  }
});

module.exports = router;
