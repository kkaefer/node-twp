var tdl = require('./lib/api');
var twp = require('./lib/twp');

var api = tdl.fromFile('./misc/echo.tdl');

var client = new twp.Client(api.protocols.byName['Echo']);

client.connect(8000, 'localhost');

client.on('connect', function() {
    client.send('Request', {
        text: 'foo',
        anytype: new api.type.Imaginary()
    });

    client.on('message', function(name, content) {
        console.warn(name, content);
        client.close();
    });
});
