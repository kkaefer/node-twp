var tdl = require('./lib/api');
var twp = require('./lib/twp');
var api = tdl.fromFile('./misc/calc.tdl');

var localhost = new Buffer([127, 0, 0, 1]);
var args = [
    { expr: {
        host: localhost,
        port: 9001,
        arguments: [
            { expr: {
                host: new Buffer([127, 0, 0, 2]),
                port: 9003,
                arguments: [
                    { value: 6 }
                ]
            }},
            { value: 3 }
        ]
    }},
    { value: 4 }
];

var host = '127.0.0.1';
var address = host;
var port = 9002;

var client = new twp.Client(api.protocols.byName['Calculator']);

console.warn('Connecting to ' + address + ' on port ' + port);
client.connect(port, address);

client.on('connect', function() {
    client.sendRequest({
        request_id: 0,
        arguments: args
    });

    client.on('message', function(name, content) {
        console.warn(name, content);
        client.close();
    });
});
