var util = require('util');
var EventEmitter = require('events').EventEmitter;

module.exports = Connection;
util.inherits(Connection, EventEmitter);
function Connection(socket, protocol) {
    this.socket = socket;

    // Stores a list of received partial buffers.
    this.buffer = new Buffer(0);
    this.stack = [];

    ['bufferData', 'read', 'readPreamble', 'readProtocol', 'writePreamble',
     'error', 'end']
        .forEach(function(name) {
            this[name] = this[name].bind(this);
        }, this);

    this.socket.on('data', this.bufferData);

    if (protocol) {
        this.setProtocol(protocol);

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
    this.socket.end();
};

Connection.prototype.error = function(err) {
    this.emit('error', err);
};

Connection.prototype.setProtocol = function(protocol) {
    // Create send methods for each message name.
    this.protocol = protocol;
    Object.keys(this.protocol.messages.byName).forEach(function(name) {
        this['send' + name] = function(data) {
            return this.send(name, data);
        }
    }, this);
}

Connection.prototype.end = function() {
    // socket has been closed by remote side.
    this.emit('end');
};

Connection.PREAMBLE = 'TWP3\n';
