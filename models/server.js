const express = require('express');
const cors = require('cors');
const { dbConnection } = require('../database/config');

class Server{
    constructor(){
        this.app = express();
        this.port = process.env.PORT;
       this.paths = {
            usuarios: '/api/usuarios',
            /*roles: '/api/roles',
            habitaciones: '/api/habitaciones',
            disponibilidad: '/api/disponibilidad',
            reservas: '/api/reservas',
            auth: '/api/auth'*/
    };
        this.conectarDB();

       //Middlewares
       this.middlewares();

       //Función para las rutas
       this.routes();
    }

    async conectarDB(){
        await dbConnection();
    }

    middlewares(){
        //CORS
        this.app.use(cors());

        //Leer lo que el usuario envía por el cuerpo de la petición
        this.app.use(express.json());

        //Definir la carpeta pública
        this.app.use(express.static('public'));
    }

    routes(){
         this.app.use(this.paths.usuarios, require('../routes/users'));
        /*this.app.use(this.paths.auth, require('../routes/auth'));
        this.app.use(this.paths.roles, require('../routes/roles'));
        this.app.use(this.paths.habitaciones, require('../routes/habitaciones'));
        this.app.use(this.paths.reservas, require('../routes/reservas'));
        this.app.use(this.paths.disponibilidad, require('../routes/disponibilidad'));*/
    }

    listen(){
        this.app.listen(this.port, () => {
            console.log('Server online port: ', this.port);
        })
    }
}

module.exports = Server;