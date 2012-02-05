var Connection = require('./connection');
var TWP = require('./twp');
var Signature = require('./signature');

Connection.prototype.send = function(name, data, extensions, certificate) {
    if (!certificate && typeof extensions === 'string') {
        certificate = extensions;
        extensions = [];
    }

    if (extensions && !Array.isArray(extensions)) {
        throw new Error('extensions must be an array');
    }

    var message = this.protocol.validateMessage(name, data);
    // Add extensions to the message.
    (extensions || []).forEach(function(extension) {
        if (extension.type !== 'struct' ||
            !extension.fields ||
            typeof extension.id == 'undefined' ||
            extension.id === null) {
            throw new Error('invalid extension');
        }
        message.fields.push(extension);
    });

    var result = TWP.encode(message);

    // Sign this message before writing it to the socket if we've send a certificate.
    if (certificate) {
        // Only sign the fields (remove the trailing 0 byte and the header byte(s)).
        var signed = Signature.sign(result.slice(result[0] == 12 ? 5 : 1, result.length - 1), certificate);

        // Write the message exclusive of the final 0 byte, then send the signature
        // and a trailing 0 byte.
        this.socket.write(result.slice(0, result.length - 1));
        this.socket.write(TWP.encode({ type: 'struct', id: 28, fields: [ signed ] }));
        this.socket.write('\0');
    } else {
        this.socket.write(result);
    }
};

Connection.prototype.messageError = function(name, text) {
    this.send('MessageError', {
        failed_msg_typs: this.protocol.messageNameToID(name),
        error_text: String(text)
    });
    this.close();
};

Connection.prototype.writePreamble = function() {
    this.socket.write(Connection.PREAMBLE, 'ascii');
    this.socket.write(TWP.encode(this.protocol.id));
    this.emit('connect');
};
