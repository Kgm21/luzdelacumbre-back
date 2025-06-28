const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');

// Publicar imágenes ya guardadas
router.post('/publish', imageController.publishImages);

module.exports = router;
