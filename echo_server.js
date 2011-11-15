var tdl = require('./lib/api');
var twp = require('./lib/twp');

var api = tdl.fromFile('./misc/echo.tdl');

var server = new twp.Server(api);

server.listen(8000, 'localhost', function() {
    var address = server.server.address();
    console.warn('Listening on ' + address.address + ' on port ' + address.port);
});
server.on('connection', function(connection) {
    connection.on('message', reply);
});

function reply(message) {
    if (message.$name == 'Request') {
        this.messageError(message, "Message type not implemented");
    } else {
        this.send('Reply', {
            text: content.text,
            number_of_letters: content.text.length
        });
    }
}
