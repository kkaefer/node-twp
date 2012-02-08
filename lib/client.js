var net = require('net');
var util = require('util');
var Connection = require('./connection');

module.exports = Client;
util.inherits(Client, Connection);
function Client(protocol, options) {
    Connection.call(this, new net.Socket, protocol, options);
}
