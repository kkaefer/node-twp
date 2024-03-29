var Client = require('./lib/client');
var api = require('./lib/tdl').fromFile('./misc/echo.tdl');

if (process.argv.length !== 3) {
    console.warn('Usage: ' + process.env._ + ' "string"');
    process.exit(1);
}

var host = '::1';
var address = host;
var port = 8000;

var client = new Client(api.protocols.Echo);

console.warn('Connecting to ' + address + ' on port ' + port);
client.connect(port, address);

client.on('connect', function() {
    var string = process.argv[2];
    console.warn('Measuring "' + string + '"');

    client.sendRequest({ text: string });

    client.on('message', function(name, content) {
        console.warn(name, content);
        client.close();
    });
});
