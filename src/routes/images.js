// src/routes/images.js
const { Router } = require('express');
const { getImages } = require('../controllers/imagesController');

const router = Router();

// Ruta pública
// GET /api/images
router.get('/', getImages);

module.exports = router;
