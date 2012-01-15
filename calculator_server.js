var uuid = require('node-uuid');
var Step = require('step');

var Server = require('./lib/server');
var api = require('./lib/tdl').fromFiles(['./misc/calc.tdl', './misc/threadid.tdl']);
var calculator = require('./calculator');


var operations = {
    9001: function(o) { // +
        for (var r = 0, i = 0; i < o.length; i++) r += o[i];
        return r;
    },
    9002: function(o) { // *
        for (var r = 1, i = 0; i < o.length; i++) r *= o[i];
        return r;
    },
    9003: function(o) { // !
        // Ignore operands after the first one.
        for (var r = 1, i = o[0]; i > 0; i--) r *= i;
        return r || 1;
    },
    9004: function(o) { // -
        for (var r = o[0], i = 1; i < o.length; i++) r -= o[i];
        return r;
    },
    9005: function(o) { // /
        for (var r = o[0], i = 1; i < o.length; i++) r /= o[i];
        return r;
    },
    9006: function(o) { // -
        for (var r = o[0], i = 1; i < o.length; i++) r = Math.pow(r, o[i]);
        return r;
    },
    9007: function(o) { // sin
        // Ignore operands after the first one.
        return Math.sin(o[0]);
    },
    9008: function(o) { // cos
        // Ignore operands after the first one.
        return Math.cos(o[0]);
    },
    9009: function(o) { // tan
        // Ignore operands after the first one.
        return Math.tan(o[0]);
    },
    9010: function(o) { // pi
        return Math.PI;
    },
    9011: function(o) { // e
        return Math.E;
    },
    9012: function(o) { // sqrt
        return Math.sqrt(o[0]);
    },
    9013: function(o) { // *(-1)
        return -o[0];
    }
};

function handleRequest(fn, connection, content) {
    // Resolve all operands.
    Step(function() {
        var group = this.group();
        content.arguments.forEach(function(operand) {
            if (operand.expr) calculator(operand.expr, group());
            else group()(null, operand.value);
        });
    }, function(err, operands) {
        if (err) {
            connection.sendError({
                text: err.message
            });
        } else {
            // Compute result.
            var result = fn(operands);
            connection.sendReply({
                request_id: content.request_id,
                result: result
            });
        }
    });
}

Object.keys(operations).forEach(function(port) {
    var fn = operations[port];
    var server = new Server(api);

    server.listen(port, '::', function() {
        var address = server.server.address();
        console.warn('Listening on ' + address.address + ' on port ' + address.port);
    });

    server.on('connection', function(connection) {
        var socket = connection.socket;
        var protocol = connection.protocol;
        var address = socket.remoteAddress + ':' + socket.remotePort;
        console.warn('[' + address + ']: New connection on port ' + port);

        connection.on('message', function(name, content) {
            console.warn('[' + address + ']: Message ' + name);
            if (name === 'Request') {
                handleRequest(fn, connection, content);
            } else {
                throw new Error('Didn\'t expect message ' + name);
            }
        });

        connection.on('error', function(err) {
            console.warn(err);
        });

        connection.on('end', function() {
            console.warn('[' + address + ']: Closed');
        });
    });
});
