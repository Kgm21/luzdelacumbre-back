const express = require('express');
const cors = require('cors');
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

    this.contactPath = '/api/contact';

    

    // Conectar con la base de datos
    this.conectarDB();

    // Middlewares
    this.middlewares();

    // Rutas
    this.routes();

    // Manejo de errores 404 (movido aquí para ejecutarse después de las rutas)
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
    this.app.use(express.static('public/images'));
  }

  routes() {
    this.app.use(this.authPath, require('../routes/auth'));
    this.app.use(this.usuariosPath, require('../routes/users'));
    this.app.use(this.roomsPath, require('../routes/rooms'));
    this.app.use(this.bookingsPath, require('../routes/bookings'));
    this.app.use(this.availabilityPath, require('../routes/availability'));
    // 💬 Nueva ruta de contacto
    this.app.use(this.contactPath, require('../routes/contact'));

  }

  listen() {
    this.app.listen(this.port, () => {
      console.log('Servidor en línea en el puerto:', this.port);
    });
  }
}

module.exports = Server;