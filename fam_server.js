var tdl = require('./lib/api');
var twp = require('./lib/twp');

var api = tdl.fromFile('./misc/fam.tdl');

var server = new twp.Server(api);

server.listen(8000, function() {
    var address = server.server.address();
    console.warn('Listening on ' + address.address + ' on port ' + address.port);
});

server.on('connection', function(connection) {
    var socket = connection.socket;
    var protocol = connection.protocol;
    var address = socket.remoteAddress + ':' + socket.remotePort;
    console.warn('[' + address + ']: New connection');

    connection.on('message', function(name, content) {
        console.warn('[' + address + ']:', name, content);
    });

    connection.on('error', function(err) {
        console.warn(err);
    });

    connection.on('end', function() {
        console.warn('[' + address + ']: Closed');
    });
});
