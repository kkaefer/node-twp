var Client = require('./lib/client');
var api = require('./lib/tdl').fromFiles(['./misc/calc.tdl', './misc/threadid.tdl']);

function bufferToAddress(b) {
    if (b.length === 4) {
        return b[0] + '.' + b[1] + '.' + b[2] + '.' + b[3];
    } else if (b.length === 16) {
        var address = [];
        for (var i = 0; i < 16; i += 2) {
            address.push(b.toString('hex', i, i + 2));
        }
        return address.join(':');
    }
    throw new Error('invalid ip address');
}

module.exports = function(term, extensions, next, options) {
    var client = new Client(api.protocols.Calculator, options);
    var address = bufferToAddress(term.host);

    console.warn('Connecting to ' + address + ' on port ' + term.port);
    client.connect(term.port, address);

    client.on('connect', function() {
        console.warn('Connected.');
        client.sendRequest({
            request_id: 0,
            arguments: term.arguments
        }, extensions || []);

        client.on('message', function(name, content) {
            client.close();
            if (name !== 'Reply') console.warn(content);
            if (name !== 'Reply') next(new Error('did not receive a reply'));
            next.call(client, null, content.result);
        });

        client.on('untrustedMessage', function(err, name, content) {
            console.warn(client.id, 'INVALID MESSAGE', err.message, name, content);
        });

        client.on('authenticationError', function(code, description, detail) {
            console.warn(client.id, 'AUTHENTICATION ERROR', code, description, detail);
        });
    });
};
