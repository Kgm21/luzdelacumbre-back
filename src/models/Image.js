const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  folder:   { type: String, default: '' },  // Carpeta (opcional)
  filename: { type: String, required: true },  // Nombre del archivo, obligatorio
  src:      { type: String, required: true },  // URL o ruta de la imagen, obligatorio
  alt:      { type: String, default: '' },  // Texto alternativo, opcional
}, {
  timestamps: true,  // Para guardar createdAt y updatedAt automáticos
});

module.exports = mongoose.model('Image', ImageSchema);
