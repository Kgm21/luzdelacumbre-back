const multer = require('multer');
const path = require('path');

// Configuración de almacenamiento (puede ser local)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');  // carpeta donde se guardan las imágenes
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  },
});

const fileFilter = (req, file, cb) => {
  // Solo aceptar archivos de imagen jpg, png, jpeg
  if (
    file.mimetype === 'image/jpeg' ||
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg'
  ) {
    cb(null, true);
  } else {
    cb(new Error('Sólo se permiten imágenes jpg, jpeg y png'), false);
  }
};

const Upload = multer({ storage, fileFilter });

module.exports = Upload;
