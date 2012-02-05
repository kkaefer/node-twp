var TWP = exports;

TWP.encode = function(value, state) {
    var state = { pos: 0, buffer: new Buffer(1024) }
    encode(value, state);
    return state.buffer.slice(0, state.pos);
};

function resize(size, state) {
    var pos = state.pos;
    if (pos + size >= state.buffer.length) {
        var buffer = new Buffer(pos + size + 1024);
        state.buffer.copy(buffer);
        state.buffer = buffer;
    }
    state.pos += size;
    return pos;
}

// Writes primitive types to the stream.
function encode(value, state) {
    if (value === null) {
        state.buffer[resize(1, state)] = 1;
    } else if (typeof value === 'number') {
        encodeNumber(value, state);
    } else if (typeof value === 'string') {
        encodeString(value, state);
    } else if (Buffer.isBuffer(value)) {
        encodeBinary(value, state);
    } else if (Array.isArray(value)) {
        encodeSequence(value, state);
    } else if (value.type === 'struct') {
        encodeStruct(value, state);
    } else if (value.type === 'union') {
        encodeUnion(value, state);
    } else if (value.type === 'message') {
        encodeMessage(value, state);
    } else if (value.type === 'double') {
        encodeDouble(value, state);
    } else {
        throw new Error('Unrecognized value: ' + JSON.stringify(value));
    }
}

function encodeDouble(value, state) {
    var pos = resize(13, state);
    state.buffer[pos] = 160;
    state.buffer.writeUInt32BE(8, pos + 1);
    state.buffer.writeDoubleBE(value.value, pos + 5);
}

function encodeNumber(value, state) {
    if (value <= 127 && value >= -128) { // Short int
        var pos = resize(2, state);
        state.buffer[pos] = 13;
        state.buffer.writeInt8(value, pos + 1);
    } else { // Long int
        var pos = resize(5, state);
        state.buffer[pos] = 14;
        state.buffer.writeInt32BE(value, pos + 1);
    }
}

function encodeString(value, state) {
    value = new Buffer(value, 'utf8');
    if (value.length <= 109) { // Short string
        var pos = resize(value.length + 1, state);
        state.buffer[pos] = 17 + value.length;
        value.copy(state.buffer, pos + 1);
    } else { // Long string
        var pos = resize(value.length + 5, state);
        state.buffer[pos] = 127;
        state.buffer.writeUInt32BE(value.length, pos + 1);
        value.copy(state.buffer, pos + 5);
    }
}

function encodeBinary(value, state) {
    if (value.length <= 255) { // Short binary
        var pos = resize(value.length + 2, state);
        state.buffer[pos] = 15;
        state.buffer[pos + 1] = value.length;
        value.copy(state.buffer, pos + 2);
    } else { // Long binary
        var pos = resize(value.length + 5, state);
        state.buffer[pos] = 16;
        state.buffer.writeUInt32BE(value.length, pos + 1);
        value.copy(state.buffer, pos + 5);
    }
}

function encodeStruct(value, state) {
    if (typeof value.id === 'number') {
        var pos = resize(5, state);
        state.buffer[pos] = 12;
        state.buffer.writeUInt32BE(value.id, pos + 1);
    } else {
        state.buffer[resize(1, state)] = 2;
    }
    for (var i = 0; i < value.fields.length; i++) encode(value.fields[i], state);
    state.buffer[resize(1, state)] = 0;
}

function encodeSequence(value, state) {
    state.buffer[resize(1, state)] = 3;
    for (var i = 0; i < value.length; i++) encode(value[i], state);
    state.buffer[resize(1, state)] = 0;
}

function encodeUnion(value, state) {
    if (value.id >= 8) {
        var pos = resize(5, state);
        state.buffer[pos] = 12;
        state.buffer.writeUInt32BE(value.id, pos + 1);
    } else {
        state.buffer[resize(1, state)] = +value.id + 4;
    }
    encode(value.value, state);
}

function encodeMessage(value, state) {
    if (value.id >= 8) encodeStruct(value, state);
    else {
        state.buffer[resize(1, state)] = +value.id + 4;
        for (var i = 0; i < value.fields.length; i++) encode(value.fields[i], state);
        state.buffer[resize(1, state)] = 0;
    }
}
