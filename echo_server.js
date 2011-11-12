var tdl = require('./lib/tdl');
var twp = require('./lib/twp');

var api = new tdl.Interface(sample);
api.addFile('./misc/echo.tdl');

var server = new twp.Server(api);
server.listen(8000, 'localhost');
server.on('connection', function(connection) {
    connection.on('message', reply);
});

function reply(name, content) {
    if (name !== 'Request') {
        this.messageError(name, "Message type not implemented");
    } else {
        this.send('Reply', {
            text: content.text,
            number_of_letters: content.text.length
        });
    }
}
