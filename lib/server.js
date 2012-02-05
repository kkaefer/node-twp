var net = require('net');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Connection = require('./connection');

module.exports = Server;
util.inherits(Server, EventEmitter);
function Server(api) {
    this.server = new net.Server;
    this.api = api;
}

Server.prototype.listen = function() {
    this.server.listen.apply(this.server, arguments);

    var server = this;
    this.server.on('connection', function(socket) {
        var connection = new Connection(socket);
        connection.on('protocol', function(id) {
            var protocol = server.api.protocols[id];
            if (protocol) {
                connection.setProtocol(protocol);
                // Only emit connection events when we know the protocol.
                server.emit('connection', connection);
            } else {
                connection.emit('error', 'Unknown protocol ID');
            }
        });
    });
};
