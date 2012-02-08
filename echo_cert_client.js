var fs = require('fs');
var rl = require('readline');
var Client = require('./lib/client');

var api = require('./lib/tdl').fromFiles(['./misc/echo.tdl']);

if (process.argv.length !== 4) {
    console.warn('Usage: ' + process.env._ + ' "string" [key]');
    process.exit(1);
}

var address = 'www.dcl.hpi.uni-potsdam.de';
var port = 80;

var string = process.argv[2];
var key = fs.readFileSync(process.argv[3]);

var input = rl.createInterface(process.stdin, process.stdout, null);
input.question("Key password: ", function(password) {
    input.close();

    var client = new Client(api.protocols.Echo, {
        key: key,
        password: password,
        requireAuthentication: true
    });

    console.warn('Connecting to ' + address + ' on port ' + port);
    client.connect(port, address);

    client.on('connect', function() {
        console.warn('Measuring "' + string + '"');
        client.sendRequest({ text: string });
    });

    client.on('message', function(name, content) {
        console.warn('VALID MESSAGE', name, content);
        client.close();
    });

    client.on('untrustedMessage', function(err, name, content) {
        console.warn('INVALID MESSAGE', err.message, name, content);
    });

    client.on('authenticationError', function(code, description, detail) {
        console.warn('AUTHENTICATION ERROR', code, description, detail);
    });
});
