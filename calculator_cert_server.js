var uuid = require('node-uuid');
var fs = require('fs');
var rl = require('readline');
var Step = require('step');

if (process.argv.length !== 3) {
    console.warn('Usage: ' + process.env._ + ' [key]');
    process.exit(1);
}


function getUUID() {
    return uuid.v4({ rng: uuid.nodeRNG }, new Buffer(16));
}

var Server = require('./lib/server');
var Client = require('./lib/client');
var api = require('./lib/tdl').fromFiles(['./misc/calc.tdl', './misc/threadid.tdl', './misc/logging.tdl']);
var calculator = require('./calculator');


var logger = new Client(api.protocols.Logging);
logger.connect(80, 'www.dcl.hpi.uni-potsdam.de');
logger.on('connect', function() {
    console.warn('Connected to logging server');
    startServers();
});

var operations = {
    9001: function add(o) { // +
        for (var r = 0, i = 0; i < o.length; i++) r += o[i];
        return r;
    },
    9002: function mul(o) { // *
        for (var r = 1, i = 0; i < o.length; i++) r *= o[i];
        return r;
    },
    9003: function fac(o) { // !
        // Ignore operands after the first one.
        for (var r = 1, i = o[0]; i > 0; i--) r *= i;
        return r || 1;
    },
    9004: function sub(o) { // -
        for (var r = o[0], i = 1; i < o.length; i++) r -= o[i];
        return r;
    },
    9005: function div(o) { // /
        for (var r = o[0], i = 1; i < o.length; i++) r /= o[i];
        return r;
    },
    9006: function pow(o) { // ^
        for (var r = o[0], i = 1; i < o.length; i++) r = Math.pow(r, o[i]);
        return r;
    },
    9007: function sin(o) { // sin
        // Ignore operands after the first one.
        return Math.sin(o[0]);
    },
    9008: function cos(o) { // cos
        // Ignore operands after the first one.
        return Math.cos(o[0]);
    },
    9009: function tan(o) { // tan
        // Ignore operands after the first one.
        return Math.tan(o[0]);
    },
    9010: function pi(o) { // pi
        return Math.PI;
    },
    9011: function e(o) { // e
        return Math.E;
    },
    9012: function sqrt(o) { // sqrt
        return Math.sqrt(o[0]);
    },
    9013: function inv(o) { // *(-1)
        return -o[0];
    }
};

function handleRequest(fn, connection, content, extensions, thread) {
    // Resolve all operands.
    Step(function() {
        var group = this.group();
        content.arguments.forEach(function(operand) {
            if (operand.expr) calculator(operand.expr, extensions, group(), connection.options);
            else group()(null, operand.value);
        });
    }, function(err, operands) {
        var log = {
            seconds: Date.now() / 1000 | 0,
            useconds: Date.now() % 1000 * 1000,
            source: 'node-twp/' + fn.name,
            thread_id: uuid.unparse(thread)
        }

        if (err) {
            log.text = err.stack;
            logger.sendLogEntry(log);

            connection.sendError({
                text: err.message
            });
        } else {
            // Compute result.
            var result = fn(operands);
            log.text = 'Result: ' + fn.name + '(' + operands.join(', ') + ') = ' + result;
            logger.sendLogEntry(log);

            connection.sendReply({
                request_id: content.request_id,
                result: result
            });
        }
    });
}

function handleConnection(connection, port, fn) {
    var socket = connection.socket;
    var protocol = connection.protocol;
    var address = socket.remoteAddress + ':' + socket.remotePort;
    console.warn('[' + address + ']: New connection on port ' + port);

    connection.on('message', function(name, content, extensions) {
        console.warn('[' + address + ']: Message ' + name);

        // Thread handling
        var threadID = extensions.filter(function(extension) {
            return extension.id == api.types.ThreadID.id;
        });
        if (threadID.length == 0) {
            var thread = getUUID();
            extensions.push(api.types.ThreadID.validate({ uuid: thread }));
        } else {
            var thread = threadID[0].data.uuid;
        }

        console.warn('[' + address + ']: Handling ' + uuid.unparse(thread));

        if (name === 'Request') {
            handleRequest(fn, connection, content, extensions, thread);
        } else {
            throw new Error('Didn\'t expect message ' + name);
        }
    });

    connection.on('untrustedMessage', function(err, name, content) {
        console.warn('INVALID MESSAGE', err.message, name, content);
    });

    connection.on('authenticationError', function(code, description, detail) {
        console.warn('AUTHENTICATION ERROR', code, description, detail);
    });

    connection.on('error', function(err) {
        console.warn(err);
    });

    connection.on('end', function() {
        console.warn('[' + address + ']: Closed');
    });
}

function startServers() {
    var key = fs.readFileSync(process.argv[2]);

    var input = rl.createInterface(process.stdin, process.stdout, null);
    input.question("Key password: ", function(password) {
        input.close();

        Object.keys(operations).forEach(function(port) {
            var fn = operations[port];
            var server = new Server(api, {
                key: key,
                password: password,
                requireAuthentication: true
            });

            server.listen(port, '::', function() {
                var address = server.server.address();
                console.warn('Listening on ' + address.address + ' on port ' + address.port);
            });

            server.on('connection', function(connection) {
                handleConnection(connection, port, fn);
            });
        });
    });
}
