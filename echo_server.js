var tdl = require('./lib/tdl');
var twp = require('./lib/twp');

var api = new tdl.Interface();
api.addFile('./misc/echo.tdl');

var server = new twp.Server(api.protocol.Echo);
server.listen(8000, 'localhost');
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
