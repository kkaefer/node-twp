var Connection = require('./connection');

// Writes primitive types to the stream.
Connection.prototype.write = function(value) {
    if (value === null) {
        this.socket.write('\x01', 'ascii');
    } else if (typeof value === 'number') {
        this.writeNumber(value);
    } else if (typeof value === 'string') {
        this.writeString(value);
    } else if (Buffer.isBuffer(value)) {
        this.writeBuffer(value);
    } else if (Array.isArray(value)) {
        this.writeSequence(value);
    } else if (value.type === 'struct') {
        this.writeStruct(value);
    } else if (value.type === 'union') {
        this.writeUnion(value);
    } else if (value.type === 'message') {
        this.writeMessage(value);
    } else {
        throw new Error('Unrecognized value: ' + JSON.stringify(value));
    }
};

Connection.prototype.send = function(name, data) {
    var message = this.protocol.validateMessage(name, data);
    this.write(message);
};

Connection.prototype.writePreamble = function() {
    this.socket.write('TWP3\n', 'ascii');
    this.write(this.protocol.id);
};

Connection.prototype.writeNumber = function(value) {
    if (value <= 127 && value >= -128) {
        // Short int
        var message = new Buffer([ 13, 0 ]);
        message.writeInt8(value, 1);
    } else {
        // Long int
        var message = new Buffer([ 14, 0, 0, 0, 0 ]);
        message.writeInt32BE(value, 1);
    }
    this.socket.write(message);
};

Connection.prototype.writeString = function(value) {
    var length = Buffer.byteLength(value, 'utf8');
    if (length <= 109) {
        // Short string
        this.socket.write(new Buffer([ 17 + length ]));
    } else {
        // Long string
        this.writeTaggedUInt32BE(127, length);
    }
    this.socket.write(value, 'utf8');
};

Connection.prototype.writeBuffer = function(value) {
    if (value.length <= 255) {
        // Short blob
        var tag = new Buffer([ 15, 0 ]);
        tag.WriteUInt8(value.length, 1);
        this.socket.write(tag);
    } else {
        // Long blob
        this.writeTaggedUInt32BE(16, value.length);
    }
    this.socket.write(value);
};

Connection.prototype.writeTaggedUInt32BE = function(tag, id) {
    var message = new Buffer([ tag, 0, 0, 0, 0 ]);
    message.WriteUInt32BE(id, 1);
    this.socket.write(message);
};

Connection.prototype.writeStruct = function(value) {
    if ('id' in value) {
        this.writeTaggedUInt32BE(12, value.id);
    } else {
        this.socket.write('\x02', 'ascii');
    }
    value.fields.forEach(this.write, this);
    this.socket.write('\0');
};

Connection.prototype.writeSequence = function(value) {
    this.socket.write('\x03', 'ascii');
    value.forEach(this.write, this);
    this.socket.write('\0');
};

Connection.prototype.writeUnion = function(value) {
    if (value.id >= 8) {
        this.writeTaggedUInt32BE(12, value.id);
    } else {
        this.socket.write(new Buffer([ 4 + value.id ]));
    }
    this.write(value.value);
};

Connection.prototype.writeMessage = function(value) {
    this.socket.write(new Buffer([ 4 + value.id ]));
    value.fields.forEach(this.write, this);
    this.socket.write('\0');
};

Connection.prototype.messageError = function(name, text) {
    this.send('MessageError', {
        failed_msg_typs: this.protocol.messageNameToID(name),
        error_text: String(text)
    });
    this.close();
};