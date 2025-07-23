// src/controllers/imagesController.js
const Image = require('../models/Image');

const getImages = async (req, res) => {
  try {
    const images = await Image.find().lean();
    const formatted = images.map(img => ({
      id:       img._id,
      src:      img.src,
      alt:      img.alt || img.filename,
      folder:   img.folder,
      filename: img.filename
    }));
    res.json(formatted);
  } catch (err) {
    console.error('Error en getImages:', err);
    res.status(500).json({ message: 'Error al obtener imágenes', error: err.message });
  }
};

module.exports = { getImages };
