var util = require('util');
var Signature = require('./signature');
var EventEmitter = require('events').EventEmitter;

module.exports = Connection;
util.inherits(Connection, EventEmitter);
function Connection(socket, protocol, options) {
    this.socket = socket;
    this.options = options || {};

    this.loadKey();

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

Connection.prototype.loadKey = function() {
    var hasCert = !(typeof this.options.decryptedKey === 'undefined');
    if (this.options.key && !hasCert) {
        var server = this;
        Signature.p12toPEM(this.options.key, this.options.password, function(err, pem) {
            if (err) server.emit(err);
            else {
                var cer = Signature.PEMtoCER(pem);
                server.options.decryptedKey = pem;
                server.options.certificate = Signature.CERtoDER(cer);
                server.emit('loadedKey');
            }
        });
    } else if (!hasCert) {
        this.options.certificate = null;
        this.options.decryptedKey = null;
        this.emit('loadedKey');
    } else {
        this.emit('loadedKey');
    }
};

// Write functions
require('./connection_write.js');

// Read functions
require('./connection_read.js');

Connection.prototype.close = function() {
    this.socket.end();
};

Connection.prototype.error = function(err) {
    return this.emit('error', err);
};

Connection.prototype.setProtocol = function(protocol) {
    // Create send methods for each message name.
    this.protocol = protocol;
    Object.keys(this.protocol.messages).forEach(function(name) {
        var message = this.protocol.messages[name];
        this['send' + message.name] = function(data, extensions, signature) {
            return this.send(message.name, data, extensions, signature);
        }
    }, this);
}

Connection.prototype.end = function() {
    // socket has been closed by remote side.
    this.emit('end');
};

Connection.PREAMBLE = 'TWP3\n';
