exports.Protocol = Protocol;
function Protocol(type, data) {}

Protocol.prototype.validateMessage = function(name, data) {
    var message = (name instanceof Message) ? name : this.messages[name];

    if (!message) {
        throw new Error('Unknown message name "' + name + '"');
    }

    return message.validate(data);
};

Protocol.prototype.parseMessage = function(description, rawMessage) {
    if (!rawMessage) {
        rawMessage = description;
        if (!this.messages[rawMessage.id]) {
            throw new Error('Unknown message ID "' + rawMessage.id + '"');
        }
        description = this.messages[rawMessage.id];
    }

    var message = description.parse(rawMessage);
    message.id = rawMessage.id;
    var types = this.interface.types;
    message.extensions.forEach(function(extension) {
        if (types[extension.id]) {
            extension.name = types[extension.id].name;
            extension.data = types[extension.id].parse(extension);
        }
    }, this);
    return message;
};



exports.Field = Field;
function Field(field) {
    this.name = field.name.value;
    this.type = field.type;
    // if (field.type.base) this.base = field.type.base;
    if (field.optional) this.optional = field.optional;
}

Field.prototype.validate = function(data) {
    if (this.type.validate) {
        return this.type.validate(data);
    }

    switch (this.type) {
        case 'string':
            return String(data);
        case 'int':
            return parseInt(data, 10);
        // case 'any':
        //     return data; break;
        case 'double':
            return { type: 'double', value: parseFloat(data) };
        case 'binary':
            if (!Buffer.isBuffer(data)) throw new Error('Binary ' + this.name + ' requires a Buffer');
            return data;
        default:
            throw new Error(this.type + ' not implemented');
    }
};

Field.prototype.parse = function(data) {
    if (this.type.parse) {
        return this.type.parse(data);
    }

    switch (this.type) {
        case 'string':
            if (typeof data !== 'string') throw new Error('expected string');
            return data;
        case 'int':
            if (typeof data !== 'number') throw new Error('expected integer');
            return data;
        // case 'any':
        //     return data;
        case 'double':
            if (data.type !== 'double') throw new Error('expected double');
            return data.value;
        case 'binary':
            if (!Buffer.isBuffer(data)) throw new Error('expected binary');
            return data;
        default:
            throw new Error(this.type + ' not implemented');
    }
};

exports.Struct = Struct;
function Struct(entity) {}

Struct.prototype.validate = function(data) {
    if (typeof data !== 'object' || data === null) {
        throw new Error('struct ' + this.name + ' requires a hashmap');
    }

    return {
        type: 'struct',
        id: this.id,
        fields: this.fields.map(function(field) {
            return field.validate(data[field.name]);
        })
    };
};

Struct.prototype.parse = function(data) {
    if (data.fields.length !== this.fields.length) throw new Error('struct has invalid length');
    var struct = {};
    for (var i = 0; i < this.fields.length; i++) {
        struct[this.fields[i].name] = this.fields[i].parse(data.fields[i]);
    }
    return struct;
};


exports.Message = Message;
function Message(type, data) {}

Message.prototype.validate = function(data) {
    var message = Struct.prototype.validate.apply(this, arguments);
    message.type = 'message';
    return message;
};

Message.prototype.parse = function(data) {
    if (data.fields.length < this.fields.length) throw new Error('message has invalid length');
    var struct = {};
    for (var i = 0; i < this.fields.length; i++) {
        struct[this.fields[i].name] = this.fields[i].parse(data.fields[i]);
    }
    // Extract extensions
    var extensions = data.fields.slice(i);
    return { name: this.name, data: struct, extensions: extensions };
};


exports.Sequence = Sequence;
function Sequence(type, data) {}

Sequence.prototype.validate = function(data) {
    if (!Array.isArray(data)) throw new Error('Sequence ' + this.name + ' must be an array');
    var contains = this.contains;
    return data.map(function(item) {
        return contains.validate(item);
    });
};

Sequence.prototype.parse = function(data) {
    if (!Array.isArray(data)) throw new Error('Expected sequence');
    var contains = this.contains;
    return data.map(function(item) {
        return contains.parse(item);
    });
};

exports.Union = Union;
function Union(type, data) {}

Union.prototype.validate = function(data) {
    var alternatives = Object.keys(data);
    if (alternatives.length != 1) throw new Error('Union ' + this.name + ' requires exactly one value');

    for (var id in this.cases) {
        if (this.cases[id].name === alternatives[0]) {
            return {
                type: 'union',
                id: parseInt(id, 10),
                value: this.cases[id].validate(data[alternatives[0]])
            };
        }
    }

    // Couldn't find an alternative.
    throw new Error('Union ' + this.name + ' doesn\'t have a known alternative');
};

Union.prototype.parse = function(data) {
    if (data.type !== 'union') throw new Error('expected union');
    var type = this.cases[data.id];
    if (!type) throw new Error('union case does not exist');
    var union = {};
    union[type.name] = type.parse(data.value);
    return union;
};
