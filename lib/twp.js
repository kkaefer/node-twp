var net = require('net');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var Connection = require('./connection');


exports.Client = Client;
util.inherits(Client, Connection);
function Client(protocol) {
    Connection.call(this, new net.Socket, protocol);
}



exports.Server = Server;
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
        server.emit('connection', connection);
    });
};
