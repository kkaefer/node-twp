var Connection = require('./connection');

Connection.prototype.bufferData = function(data) {
    this.buffers.push(data);
    this.buffers.bytes += data.length;
};

Connection.prototype.read = function() {
    // Start decoding.
};

Connection.prototype.getBytes = function(requested) {
    if (this.buffers.bytes < requested) return;

    if (this.buffers[0].length >= requested) {
        // We can satisfy everything from one buffer.
        var buffer = this.buffers[0];

        // Slice or remove the buffer we take away from.
        if (buffer.length == requested) this.buffers.shift();
        else this.buffers[0] = buffer.slice(requested);

        this.buffers.bytes -= requested;
        return buffer.slice(0, requested);
    } else {
        // We need to pull data from multiple buffers.
        var result = new Buffer(requested);

        for (var pos = 0, length = 0; pos < requested; pos += length) {
            var buffer = this.buffers[0];
            var length = requested - pos;
            buffer.copy(result, pos, 0, length);
            if (buffer.length == length) this.buffers.shift();
            else this.buffers[0] = buffer.slice(length);
        }

        this.buffers.bytes -= requested;
        return result;
    }
};

Connection.prototype.readPreamble = function() {
    var preamble = this.getBytes(Connection.PREAMBLE.length);
    if (typeof preamble !== 'undefined') {
        if (preamble.toString('ascii') === Connection.PREAMBLE) {
            // Swap listeners.
            this.socket.removeListener('data', this.readPreamble);
            this.socket.on('data', this.readProtocol);
        } else {
            this.emit('error', 'Client does\'nt speak TWP.');
        }
    }
};

Connection.prototype.readProtocol = function() {
    var id = this.readNumber();
    if (typeof id !== 'undefined') {
        this.socket.removeListener('data', this.readProtocol);
        this.emit('protocol', id);
        this.read();
    }
};

Connection.prototype.readNumber = function() {
    if (this.buffers.bytes < 1) return;
    var tag = this.buffers[0][0];
    if (tag === 13 && this.buffers.bytes >= 2) {
        // 1 byte integer
        var number = this.buffers[0].readInt8(1);
        this.buffers[0] = this.buffers[0].slice(2);
        return number;
    } else if (tag === 14 && this.buffers.bytes >= 5) {
        var number = this.buffers[0].readInt32BE(1);
        this.buffers[0] = this.buffers[0].slice(5);
        return number;
    } else {
        // protocol error; expected number, but got something different.
    }
};

Connection.prototype.read
