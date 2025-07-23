const fs = require('fs');
const path = require('path');
const { ObjectId } = require('mongodb');

const getImages = (req, res) => {
  const imagesDir = path.join(__dirname, '../../public/images');
  const result = [];

  fs.readdirSync(imagesDir, { withFileTypes: true }).forEach((dirent) => {
    if (dirent.isDirectory()) {
      const folder = dirent.name;
      const folderPath = path.join(imagesDir, folder);

      fs.readdirSync(folderPath).forEach((file) => {
        const ext = path.extname(file).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
          result.push({
            id: new ObjectId().toHexString(),
            src: `/images/${folder}/${file}`,
            alt: `Imagen de ${folder}`,
            folder,
            filename: file,
          });
        }
      });
    }
  });

  res.json(result);
};

module.exports = {
  getImages,
};
