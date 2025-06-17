require('events').EventEmitter.defaultMaxListeners = 15; // Evita MaxListenersExceededWarning
require('dotenv').config();
const Server = require('../models/server');

const server = new Server();
server.listen();