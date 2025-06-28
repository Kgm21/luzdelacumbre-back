const express = require('express');
const router = express.Router();
const imageController = require('../controllers/imageController');

// Publicar imágenes ya guardadas
router.post('/publish', imageController.publishImages);
router.get('/', imageController.listImages);

module.exports = router;
