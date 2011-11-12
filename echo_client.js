var tdl = require('./lib/tdl');
var twp = require('./lib/twp');

var api = new tdl.Interface(sample);
api.addFile('./misc/echo.tdl');

var protocol = api.getProtocol('Echo');

var client = new twp.Client(protocol);
client.connect(8000, 'localhost');
client.on('connect', function() {
    client.send('Request', {
        text: 'foo'
    });

    client.on('message', function(name, content) {
        console.warn(name, content);
        client.close();
    });
});
