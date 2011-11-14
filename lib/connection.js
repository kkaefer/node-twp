var util = require('util');
var EventEmitter = require('events').EventEmitter;

module.exports = Connection;
util.inherits(Connection, EventEmitter);
function Connection(socket, protocol) {
    this.socket = socket;
    this.protocol = protocol || false;

    if (this.protocol) {
        // Bridge connect method.
        this.connect = this.socket.connect.bind(this.socket);

        // When initiating, send the preamble.
        this.socket.on('connect', this.writePreamble.bind(this));

        // Parses incoming data and emits message events.
        this.socket.on('data', this.read.bind(this));
    } else {
        // Protocol is unknown, so we are the server on this socket.
        // readPreamble reads the first few bytes which contains the
        // protocol ID and attaches the actual read handler once the
        // protocol is known.
        this.socket.on('data', this.readPreamble.bind(this));
    }

    this.socket.on('error', this.error.bind(this));
    this.socket.on('end', this.end.bind(this));
}

// Write functions
require('./connection_write.js');

// Read functions
require('./connection_read.js');

Connection.prototype.close = function() {
    this.socket.close();
};

Connection.prototype.error = function(err) {
    this.emit('error', err);
};

Connection.prototype.end = function() {
    // socket has been closed by remote side.
    this.emit('end');
};

