const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // Agregamos fs para depuración
const { dbConnection } = require('../database/config');

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;

    // Rutas base
    this.authPath = '/api/auth';
    this.usuariosPath = '/api/usuarios';
    this.roomsPath = '/api/rooms';
    this.bookingsPath = '/api/bookings';
    this.availabilityPath = '/api/availability';
    this.contactPath = '/api/contact';
    this.imagesPath = '/api/images';

    // Conectar DB
    this.conectarDB();

    // Middlewares
    this.middlewares();

    // Rutas
    this.routes();

    // 404
    this.app.use((req, res) => {
      res.status(404).json({ message: 'Ruta no encontrada' });
    });
  }

  async conectarDB() {
    try {
      await dbConnection();
      console.log('Base de datos conectada');
    } catch (error) {
      console.error('Error DB:', error);
      throw new Error('No se pudo conectar con la base de datos');
    }
  }

  middlewares() {
  this.app.use(cors());
  this.app.use(express.json());

  // Ruta correcta hacia public
  const publicPath = path.join(__dirname, '../../public');
  this.app.use(express.static(publicPath));

  // Ruta correcta hacia imágenes
  const imagesPath = path.join(__dirname, '../../public/images');
  this.app.use('/images', express.static(imagesPath));

 this.app.get('/api/test-images', (req, res) => {
  const imagesPath = path.join(__dirname, '../../public/images'); // asegúrate de tener esta ruta bien
  fs.readdir(imagesPath, (err, folders) => {
    if (err) return res.status(500).json({ error: err.message });
    fs.readdir(path.join(imagesPath, 'cabana1'), (err2, files) => {
      if (err2) return res.status(500).json({ error: err2.message });
      res.json({ folders, filesInCabana1: files });
    });
  });
});
  }


  routes() {
    // Ruta de la galería
    this.app.use(this.imagesPath, require('../routes/images'));

    // Resto de rutas
    this.app.use(this.authPath, require('../routes/auth'));
    this.app.use(this.usuariosPath, require('../routes/users'));
    this.app.use(this.roomsPath, require('../routes/rooms'));
    this.app.use(this.bookingsPath, require('../routes/bookings'));
    this.app.use(this.availabilityPath, require('../routes/availability'));
    this.app.use(this.contactPath, require('../routes/contact'));
  }

  listen() {
    this.app.listen(this.port, () => {
      console.log(`Servidor en línea en el puerto ${this.port}`);
    });
  }
}

module.exports = Server;