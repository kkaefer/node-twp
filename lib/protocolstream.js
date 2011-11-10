
function ProtocolStream() {

}

ProtocolStream.prototype.version = 1;

ProtocolStream.prototype.preamble = function() {
    this.stream.write('TWP3\n', 'ascii');
    this.write(this.version);
};

ProtocolStream.prototype.write = function(value) {
    if (value === null) {
        this.stream.write('\x01', 'ascii');
    }
    else if (typeof value === 'number') {
        if (value <= 127 && value >= -128) {
            // Short int
            var message = new Buffer([ 13, 0 ]);
            message.writeInt8(value, 1);
        } else {
            // Long int
            var message = new Buffer([ 13, 0, 0, 0, 0 ]);
            message.writeInt32BE(value, 1);
        }
        this.stream.write(message);
    }
    else if (typeof value === 'string') {
        var length = Buffer.byteLength(value, 'utf8');
        if (length <= 109) {
            // Short string
            var message = new Buffer([ 17 + length ])
        } else {
            // Long string
            var message = new Buffer([ 127, 0, 0, 0, 0 ]);
            message.writeUInt32BE(length, 1);
        }
        this.stream.write(message);
        this.stream.write(value, 'utf8');
    }
    else if (Buffer.isBuffer(value)) {
        if (value.length <= 255) {
            // Short blob
            var message = new Buffer([ 15, 0 ]);
            message.WriteUInt8(value.length, 1);
        } else {
            // Long blob
            var message = new Buffer([ 16, 0, 0, 0, 0 ]);
            message.WriteUInt32BE(value.length, 1);
        }
        this.stream.write(message);
        this.stream.write(value);
    }
    else {
        throw new Error('Unrecognized value');
    }
};
