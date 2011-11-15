var util = require('util');
var EventEmitter = require('events').EventEmitter;

module.exports = Connection;
util.inherits(Connection, EventEmitter);
function Connection(socket, protocol) {
    this.socket = socket;
    this.protocol = protocol || false;

    // Stores a list of received partial buffers.
    this.buffers = [];
    this.buffers.bytes = 0;

    ['bufferData', 'read', 'readPreamble', 'readProtocol', 'writePreamble',
     'error', 'end']
        .forEach(function(name) {
            this[name] = this[name].bind(this);
        }, this);

    if (this.protocol) {
        // Bridge connect method.
        this.connect = this.socket.connect.bind(this.socket);

        // When initiating, send the preamble.
        this.socket.on('connect', this.writePreamble);

        // Parses incoming data and emits message events.
        this.socket.on('data', this.read);
    } else {
        // Protocol is unknown, so we are the server on this socket.
        // readPreamble reads the first few bytes which contains the
        // protocol ID and attaches the actual read handler once the
        // protocol is known.
        this.socket.on('data', this.bufferData);
        this.socket.on('data', this.readPreamble);
    }

    this.socket.on('error', this.error);
    this.socket.on('end', this.end);
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


Connection.PREAMBLE = 'TWP3\n';