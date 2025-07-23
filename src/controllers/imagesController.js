const Image = require('../models/Image');

const getImages = async (req, res) => {
  try {
    // Obtener todas las imágenes de la colección
    const images = await Image.find().lean();

    // Formatear cada imagen para la respuesta
    const formatted = images.map(img => ({
      id:       img._id,               // Id único (MongoDB)
      src:      img.src,               // URL o ruta de la imagen (relativa o absoluta)
      alt:      img.alt || img.filename,  // Texto alternativo (fallback a filename)
      folder:   img.folder,            // Carpeta donde está almacenada (si usas este dato)
      filename: img.filename           // Nombre del archivo
    }));

    // Enviar JSON con las imágenes formateadas
    res.json(formatted);

  } catch (err) {
    console.error('Error en getImages:', err);
    res.status(500).json({ message: 'Error al obtener imágenes', error: err.message });
  }
};

module.exports = { getImages };
