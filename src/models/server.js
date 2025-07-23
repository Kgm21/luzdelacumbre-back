const express = require('express');
const cors = require('cors');
const path = require('path');
const { dbConnection } = require('../database/config');

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;

    // Definir rutas base
    this.authPath = '/api/auth';
    this.usuariosPath = '/api/usuarios';
    this.roomsPath = '/api/rooms';
    this.bookingsPath = '/api/bookings';
    this.availabilityPath = '/api/availability';
    
    this.contactPath = '/api/contact';

    // Conectar a base de datos
    this.conectarDB();

    // Middlewares
    this.middlewares();

    // Rutas de la aplicación
    this.routes();

    // Manejo de rutas no encontradas
    this.app.use((req, res) => {
      res.status(404).json({ message: 'Ruta no encontrada' });
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
    this.app.use(cors());

    // Parseo de cuerpo JSON
    this.app.use(express.json());

    // Archivos estáticos
    this.app.use(express.static('public'));
    this.app.use(express.static(path.join(__dirname, '../public')));
    this.app.use('/images', express.static(path.join(__dirname, '../public/images')));
  }

  routes() {
    this.app.use(this.authPath, require('../routes/auth'));
    this.app.use(this.usuariosPath, require('../routes/users'));
    this.app.use(this.roomsPath, require('../routes/rooms'));
    this.app.use(this.bookingsPath, require('../routes/bookings'));
    this.app.use(this.availabilityPath, require('../routes/availability'));
  
    this.app.use(this.contactPath, require('../routes/contact'));
  }

  listen() {
    this.app.listen(this.port, () => {
      console.log('Servidor en línea en el puerto:', this.port);
    });
  }
}

module.exports = Server;