var tdl = require('./lib/tdl');
var twp = require('./lib/twp');

var api = new tdl.Interface();
api.addFile('./misc/echo.tdl');

var client = new twp.Client(api.protocol.Echo);
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
