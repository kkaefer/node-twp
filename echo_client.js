var tdl = require('./lib/api');
var twp = require('./lib/twp');

var api = tdl.fromFile('./misc/echo.tdl');

if (process.argv.length !== 3) {
    console.warn('Usage: ' + process.env._ + ' "string"');
    process.exit(1);
}

var client = new twp.Client(api.protocols.byName['Echo']);

client.connect(80, 'www.dcl.hpi.uni-potsdam.de');

client.on('connect', function() {
    var string = process.argv[2];
    console.warn('Measuring "' + string + '"');

    client.send('Request', {
        text: string
    });

    client.on('message', function(name, content) {
        console.warn(name, content);
        client.close();
    });
});
