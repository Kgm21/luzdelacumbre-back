const express = require('express');
const cors = require('cors');
const { dbConnection } = require('../database/config'); // Ajustado para la raíz

class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.authPath = '/api/auth';
    this.usuariosPath = '/api/usuarios';
    this.roomsPath = '/api/rooms';
    this.bookingsPath = '/api/bookings';
    this.availabilityPath = '/api/availability';

    // Conectar con Base de datos
    this.conectarDB();

    // Middlewares
    this.middlewares();

    // Función para las rutas
    this.routes();
  }

  async conectarDB() {
    await dbConnection();
  }

  middlewares() {
    // CORS
    this.app.use(cors());

    // Leer lo que el usuario envía por el cuerpo de la petición
    this.app.use(express.json());

    // Definir la carpeta pública
    this.app.use(express.static('public'));

    // Manejo de errores 404 para rutas no encontradas
    this.app.use((req, res) => {
      res.status(404).json({
        message: 'Ruta no encontrada',
      });
    });
  }

  routes() {
    this.app.use(this.authPath, require('../routes/auth'));
    this.app.use(this.usuariosPath, require('../routes/users'));
    this.app.use(this.roomsPath, require('../routes/rooms'));
    this.app.use(this.bookingsPath, require('../routes/bookings'));
    this.app.use(this.availabilityPath, require('../routes/availability'));
  }

  listen() {
    this.app.listen(this.port, () => {
      console.log('Server online port: ', this.port);
    });
  }
}

module.exports = Server;