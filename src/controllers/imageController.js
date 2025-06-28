const fs = require('fs').promises;
const path = require('path');
const Image = require('../models/Image');
const imagesDir = path.join(__dirname, '../../public/images');

const publishImages = async (req, res) => {
  try {
    const subfolders = await fs.readdir(imagesDir, { withFileTypes: true });
    const folders = subfolders.filter(dirent => dirent.isDirectory());

    let count = 0;

    for (const folder of folders) {
      const folderPath = path.join(imagesDir, folder.name);
      const files = await fs.readdir(folderPath);
      const images = files.filter(file => /\.(jpg|jpeg|png|gif|webp)$/i.test(file));

      for (const file of images) {
        const src = `/images/${folder.name}/${file}`;
        const alt = `Imagen de ${folder.name}`;
        const filename = file;

        // Verificamos si ya existe en la base de datos
        const exists = await Image.findOne({ src });

        if (!exists) {
          const newImage = new Image({ folder: folder.name, filename, src, alt });
          await newImage.save();
          count++;
        }
      }
    }

    res.status(201).json({ message: `${count} imágenes registradas en MongoDB.` });
  } catch (error) {
    console.error('❌ Error al publicar imágenes:', error);
    res.status(500).json({ message: 'Error al publicar imágenes' });
  }
};
const listImages = async (req, res) => {
  try {
    const images = await Image.find({});
    res.json(images);
  } catch (error) {
    console.error('Error al obtener imágenes:', error);
    res.status(500).json({ message: 'Error al obtener imágenes' });
  }
};
module.exports = {
  publishImages,
   listImages,
};
