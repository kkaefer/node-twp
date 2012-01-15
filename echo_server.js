var Server = require('./lib/server');
var api = require('./lib/tdl').fromFile('./misc/echo.tdl');

var server = new Server(api);

server.listen(8000, '::', function() {
    var address = server.server.address();
    console.warn('Listening on ' + address.address + ' on port ' + address.port);
});
server.on('connection', function(connection) {
    connection.on('message', reply);
});

function reply(name, content) {
    if (name != 'Request') {
        this.messageError(message, "Message type not implemented");
    } else {
        this.sendReply({
            text: content.text,
            number_of_letters: content.text.length
        });
    }
}
