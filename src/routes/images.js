const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const router = express.Router();

// Ruta al directorio principal de imágenes
const imagesDir = path.join(__dirname, '../public/images');

router.get('/images', async (req, res) => {
  try {
    // Leer todas las subcarpetas dentro de images (cabana1, cabana2, etc.)
    const subfolders = await fs.readdir(imagesDir, { withFileTypes: true });
    const imageFolders = subfolders.filter(dirent => dirent.isDirectory());

    let allImages = [];

    // Recorrer cada subcarpeta (cabanaX) y obtener las imágenes
    for (const folder of imageFolders) {
      const folderPath = path.join(imagesDir, folder.name);
      const files = await fs.readdir(folderPath);
      const images = files.filter(file => /\.(jpg|jpeg|png|gif)$/i.test(file));
      images.forEach(file => {
        allImages.push({
          folder: folder.name,
          filename: file,
          src: `/images/${folder.name}/${file}`, // Ruta relativa
          alt: `Imagen de ${folder.name}`,
        });
      });
    }

    // Seleccionar aleatoriamente 6 imágenes (ajustable)
    const maxImages = 6;
    const randomImages = allImages.sort(() => 0.5 - Math.random()).slice(0, maxImages);

    // Asignar IDs secuenciales
    const formattedImages = randomImages.map((img, index) => ({
      id: index + 1,
      src: img.src,
      alt: img.alt,
    }));

    res.json(formattedImages);
  } catch (error) {
    console.error('Error al leer las imágenes:', error);
    res.status(500).json({ message: 'Error al leer las imágenes' });
  }
});

module.exports = router;