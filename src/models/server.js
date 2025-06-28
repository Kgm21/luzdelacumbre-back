const express = require('express');
const cors = require('cors');
const path = require('path');
const { dbConnection } = require('../database/config');

class Server {
  constructor() {
 
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.authPath = '/api/auth';
    this.usuariosPath = '/api/usuarios';
    this.roomsPath = '/api/rooms';
    this.bookingsPath = '/api/bookings';
    this.availabilityPath = '/api/availability';
    this.imagesPath = '/api/images'; // Nueva ruta para imágenes

    // Conectar con la base de datos
    this.conectarDB();

    // Middlewares
    this.middlewares();

    // Rutas
    this.routes();

    // Manejo de errores 404
    this.app.use((req, res) => {
      res.status(404).json({
        message: 'Ruta no encontrada',
      });
    });
  }

  async conectarDB() {
    try {
      await dbConnection();
      console.log('Base de datos conectada');
    } catch (error) {
      console.error('Error al conectar con la base de datos:', error);
      throw new Error('No se pudo conectar con la base de datos');
    }
  }

 middlewares() {
  // CORS
  this.app.use(cors());

  // Parsear el cuerpo de las solicitudes en JSON
  this.app.use(express.json());

  // Servir archivos estáticos
  this.app.use(express.static('public'));
  this.app.use(express.static(path.join(__dirname, '../public')));

}

  routes() {
    this.app.use(this.authPath, require('../routes/auth'));
    this.app.use(this.usuariosPath, require('../routes/users'));
    this.app.use(this.roomsPath, require('../routes/rooms'));
    this.app.use(this.bookingsPath, require('../routes/bookings'));
    this.app.use(this.availabilityPath, require('../routes/availability'));
    this.app.use(this.imagesPath, require('../routes/images')); 
  }

  listen() {
    this.app.listen(this.port, () => {
      console.log('Servidor en línea en el puerto:', this.port);
    });
  }
}

module.exports = Server;