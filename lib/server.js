var net = require('net');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Connection = require('./connection');

module.exports = Server;
util.inherits(Server, EventEmitter);
function Server(api, options) {
    this.server = new net.Server;
    this.api = api;
    this.options = options || {};
}

Server.prototype.listen = function() {
    var server = this;
    var args = arguments;
    this.on('loadedKey', function() {
        server.server.listen.apply(server.server, args);

        this.server.on('connection', function(socket) {
            var connection = new Connection(socket, null, server.options);
            connection.on('protocol', function(id) {
                var protocol = server.api.protocols[id];
                if (protocol) {
                    connection.setProtocol(protocol);
                    connection.writeCertificate();
                    // Only emit connection events when we know the protocol.
                    server.emit('connection', connection);
                } else {
                    connection.emit('error', 'Unknown protocol ID');
                }
            });
        });
    });

    Connection.prototype.loadKey.call(this);
};
