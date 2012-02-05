var Connection = require('./connection');

Connection.prototype.bufferData = function(data) {
    if (this.buffer.length) {
        var buffer = new Buffer(this.buffer.length + data.length);
        this.buffer.copy(buffer);
        data.copy(buffer, this.buffer.length);
        this.buffer = buffer;
    } else {
        this.buffer = data;
    }
};

Connection.prototype.read = function() {
    // Start decoding.
    while (this.buffer.length > 0) {
        var tag = this.buffer[0];
        var offset = 1;

        if (!this.message && (tag < 4 || tag > 12)) {
            throw new Error('Protocol error, expected message or registered extension, but not tag ' + tag);
        }

        if (tag === 0) { // End of Content
            this.stack.shift();
            // When the stack is empty, the message is complete.
            if (!this.stack.length) {
                try {
                    var message = this.protocol.parseMessage(this.message);
                    var buffer = this.messageBuffer.slice(0, this.messageBufferPos);
                    this.emit('message', message.name, message.data, message.extensions, buffer);
                } catch(err) {
                    console.warn(err.stack);
                    this.close();
                } finally {
                    delete this.message;
                    delete this.messageBuffer;
                    delete this.messageBufferPos;
                }
            }
        }
        else if (tag === 1) { // No value
            this.stack[0].push(null);
        }
        else if (tag === 2) { // Struct
            var struct = { type: 'struct', fields: [] };
            this.stack[0].push(struct);
            this.stack.unshift(struct.fields);
        }
        else if (tag === 3) { // Sequence
            var sequence = [];
            this.stack[0].push(sequence);
            this.stack.unshift(sequence);
        }
        else if (tag >= 4 && tag <= 11) {
            if (this.message) { // Union
                var entity = { type: 'union', id: tag - 4, fields: [] };
                this.stack[0].push(entity);
                this.stack.unshift(entity.fields);
            }
            else { // Message
                this.message = { id: tag - 4, fields: [] };
                this.messageBuffer = new Buffer(1024);
                this.messageBufferPos = 0;
                this.stack.unshift(this.message.fields);
            }
        }
        else if (tag === 12) {
            if (this.buffer.length < 5) return;
            var id = this.buffer.readUInt32BE(1);
            if (this.message) { // struct
                var entity = { type: 'struct', id: id, fields: [], offset: this.messageBufferPos };
                this.stack[0].push(entity);
                this.stack.unshift(entity.fields);
            }
            else { // Message
                this.message = { id: id, fields: [] };
                this.messageBuffer = new Buffer(1024);
                this.messageBufferPos = 0;
                this.stack.unshift(this.message.fields);
            }
            offset += 4;
        }
        else if (tag === 13) { // Short integer
            if (this.buffer.length < 2) return;
            this.stack[0].push(this.buffer.readInt8(1));
            offset += 1;
        }
        else if (tag === 14) { // Long integer
            if (this.buffer.length < 5) return;
            this.stack[0].push(this.buffer.readInt32BE(1));
            offset += 4;
        }
        else if (tag === 15) { // short binary
            if (this.buffer.length < 2) return;
            var bytes = this.buffer.readUInt8(1);
            if (this.buffer.length < 2 + bytes) return;
            this.stack[0].push(this.buffer.slice(2, bytes + 2));
            offset += bytes + 1;
        }
        else if (tag === 16) { // long binary
            if (this.buffer.length < 2) return;
            var bytes = this.buffer.readUInt32BE(1);
            if (this.buffer.length < 5 + bytes) return;
            this.stack[0].push(this.buffer.slice(5, bytes + 5));
            offset += bytes + 4;
        }
        else if (tag >= 17 && tag <= 126) { // short string
            var bytes = tag - 17;
            if (this.buffer.length < bytes + 1) return;
            this.stack[0].push(this.buffer.toString('utf8', 1, bytes + 1));
            offset += bytes;
        }
        else if (tag === 127) { // long string
            if (this.buffer.length < 5) return;
            var bytes = this.buffer.readUInt32BE(1);
            if (this.buffer.length < 5 + bytes) return;
            this.stack[0].push(this.buffer.toString('utf8', 5, bytes + 5));
            offset += bytes + 4;
        }
        else if (tag >= 128 && tag <= 159) {
            throw new Error('not implemented');
            // spec error: no length specified, so impossible to parse?
        }
        else if (tag === 160) {
            if (this.buffer.length < 5 + 8) return;
            var bytes = this.buffer.readUInt32BE(1);
            // Can't distinguish ints from doubles in JavaScript, so use an
            // explicit container.
            this.stack[0].push({
                type: 'double',
                value: bytes === 8 ? this.buffer.readDoubleBE(5) : NaN
            });
            offset += bytes + 4;
        }
        else if (tag >= 161) {
            if (this.buffer.length < 5) return;
            var bytes = this.buffer.readUInt32BE(1);
            if (this.buffer.length < 5 + bytes) return;
            this.stack[0].push({
                type: 'custom',
                tag: tag,
                value: this.buffer.slice(5, bytes + 5)
            });
            offset += bytes + 4;
        }

        // Unions don't have a End of Content delimiter, so pop them automatically
        // when they have one element.
        if (this.stack.length > 1 && this.stack[0].length === 1) {
            var element = this.stack[1][this.stack[1].length - 1];
            if (element.type === 'union') {
                element.value = element.fields[0];
                delete element.fields;
                this.stack.shift();
            }
        }

        if (this.messageBuffer) {
            // Copy the bytes we parsed to the message buffer and advance the buffer itself.
            if (this.messageBufferPos + offset >= this.messageBuffer.length) {
                var buffer = new Buffer(this.messageBufferPos + offset + 1024);
                this.messageBuffer.copy(buffer);
                this.messageBuffer = buffer;
            }
            this.buffer.copy(this.messageBuffer, this.messageBufferPos, 0, offset);
            this.messageBufferPos += offset;
        }
        this.buffer = this.buffer.slice(offset);
    }
};

Connection.prototype.getBytes = function(requested) {
    if (this.buffer.length < requested) return;
    var result = this.buffer.slice(0, requested);
    this.buffer = this.buffer.slice(requested);
    return result;
};

Connection.prototype.readPreamble = function() {
    var preamble = this.getBytes(Connection.PREAMBLE.length);
    if (typeof preamble !== 'undefined') {
        if (preamble.toString('ascii') === Connection.PREAMBLE) {
            // Swap listeners.
            this.socket.removeListener('data', this.readPreamble);
            this.socket.on('data', this.readProtocol);
            this.readProtocol();
        } else {
            this.emit('error', new Error('Client doesn\'t speak TWP.'));
        }
    }
};

Connection.prototype.readProtocol = function() {
    if (this.buffer.length < 1) return;
    if (this.buffer[0] === 13 && this.buffer.length >= 2) {
        // 1 byte integer
        var id = this.buffer.readInt8(1);
        this.buffer = this.buffer.slice(2);
    } else if (this.buffer[0] === 14 && this.buffer.length >= 5) {
        var id = this.buffer.readInt32BE(1);
        this.buffer = this.buffer.slice(5);
    } else {
        // protocol error; expected number, but got something different.
        this.socket.removeListener('data', this.readProtocol);
        this.emit('error', new Error('Client didn\'t send protocol ID.'));
    }

    if (typeof id !== 'undefined') {
        this.socket.removeListener('data', this.readProtocol);
        this.socket.on('data', this.read);
        this.emit('protocol', id);
        this.read();
    }
};
