var fs = require('fs');
var path = require('path');
var Parser = require('./parser');

exports.fromString = function(str, name) {
    var parser = new Parser(str, name);
    return new Interface(parser.toJSON());
};

exports.fromFile = function(filename) {
    return exports.fromFiles([ filename ]);
};

exports.fromFiles = function(filenames) {
    var parser = new Parser();
    filenames.forEach(function(filename) {
        filename = path.resolve(filename);
        parser.add(fs.readFileSync(filename, 'utf8'), filename);
    });
    return new Interface(parser.toJSON());
};


function createIndex(store, names) {
    var index = { byName: {}, byID: {} };
    if (!names) names = Object.keys(store);
    names.forEach(function(name) {
        var obj = store[name];
        obj.name = name;
        index.byName[name] = obj;
        if (typeof obj.id === 'number') {
            index.byID[obj.id] = obj;
        }
    });
    return index;
}

exports.Interface = Interface;
function Interface(json) {
    var types = createIndex(json.types);

    for (var name in json.protocols) {
        var protocol = json.protocols[name];
        protocol.types = types;
        protocol.messages = createIndex(json.messages, protocol.messages);
    }

    this.protocols = createIndex(json.protocols);
}

exports.Protocol = Protocol;
function Protocol(id, messages) {
    this.id = id;
    this.messages = messages;
    // this.types is set when creating the Interface
}

/*
turns
'Request', {
    request_id: 4,

    base: { real: 3 },
    operands: [
        { real: 9 },
        { img: { real: 3, imaginary: 3 } }
    ],

    operation: 'add'
    parameters: null
}

into

{
    id: 0,
    fields: [
        'text',
        { 'type': 'union', 'id': 0, 'value': 'foo' },
        [ 3, 3, 3, 3, 3, 3 ], // sequence
        { 'type': 'struct', 'fields': ['bar'] },
        null, // no value (optional fields only)
        3,

        // Registered extensions.
        { 'type': 'struct', 'id': 39, fields: ['baz'] }
    ]
}
*/
Protocol.prototype.validateMessage = function(name, data) {
    var definition = this.messages.byName[name];
    if (!definition) {
        throw new Error('Unknown message name "' + name + '"');
    }

    var message = this.validateStruct(definition, data);
    message.type = 'message';
    return message;
};

Protocol.prototype.validateField = function(field, data) {
    if (this.types.byName[field.type]) {
        var definition = this.types.byName[field.type];
        var kind = definition.kind;
    } else {
        var kind = field.type;
    }

    switch (kind) {
        case 'string':   return String(data); break;
        case 'int':      return parseInt(data, 10); break;
        // case 'any':      return data; break;
        case 'union':    return this.validateUnion(definition, data); break;
        case 'struct':   return this.validateStruct(definition, data); break;
        case 'double':   return this.validateDouble(definition, data); break;
        case 'sequence': return this.validateSequence(definition, data); break;
        case 'binary':   return this.validateBinary(definition, data); break;
        default:         throw new Error(field.type + ' not implemented');
    }
};

Protocol.prototype.validateSequence = function(field, data) {
    if (!Array.isArray(data)) throw new Error('Sequence ' + field.name + ' must be an array');
    return data.map(function(item) {
        return this.validateField(field, item)
    }, this);
};

Protocol.prototype.validateUnion = function(field, data) {
    var alternatives = Object.keys(data);
    if (alternatives.length != 1) throw new Error('Union ' + field.name + ' requires exactly one value');

    for (var id in field.cases) {
        if (field.cases[id].name === alternatives[0]) {
            return {
                type: 'union',
                id: parseInt(id, 10),
                value: this.validateField(field.cases[id], data[alternatives[0]])
            };
        }
    }

    // Couldn't find an alternative.
    throw new Error('Union ' + field.name + ' doesn\'t have a known alternative');
};

Protocol.prototype.validateStruct = function(field, data) {
    if (typeof data !== 'object' || data === null) throw new Error('Struct ' + field.name + ' requires a hashmap');

    var struct = { type: 'struct' };
    if (typeof field.id === 'number') struct.id = field.id;
    struct.fields = field.fields.map(function(field) {
        return this.validateField(field, data[field.name]);
    }, this);
    return struct;
};

Protocol.prototype.validateBinary = function(field, data) {
    if (!Buffer.isBuffer(data)) throw new Error('Binary ' + field.name + ' requires a Buffer');
    return data;
};

Protocol.prototype.validateDouble = function(field, data) {
    return { type: 'double', value: parseFloat(data) };
};


Protocol.prototype.parseMessage = function(message) {
    var definition = this.messages.byID[message.id];
    if (!definition) {
        throw new Error('Unknown message name "' + name + '"');
    }

    var data = this.parseStruct(definition, message);
    return { name: definition.name, data: data }
};

Protocol.prototype.parseField = function(field, data) {
    if (this.types.byName[field.type]) {
        var definition = this.types.byName[field.type];
        var kind = definition.kind;
    } else {
        var kind = field.type;
    }

    switch (kind) {
        case 'string':   return this.parseString(definition, data); break;
        case 'int':      return this.parseInteger(definition, data); break;
    //     case 'any':      return data; break;
        case 'union':    return this.parseUnion(definition, data); break;
        case 'struct':   return this.parseStruct(definition, data); break;
        case 'double':   return this.parseDouble(definition, data); break;
        case 'sequence': return this.parseSequence(definition, data); break;
        case 'binary':   return this.parseBinary(definition, data); break;
        default:         throw new Error(kind + ' not implemented');
    }
};

Protocol.prototype.parseString = function(definition, data) {
    if (typeof data !== 'string') throw new Error('expected string');
    return data;
};

Protocol.prototype.parseInteger = function(definition, data) {
    if (typeof data !== 'number') throw new Error('expected integer');
    return data;
};

Protocol.prototype.parseSequence = function(field, data) {
    if (!Array.isArray(data)) throw new Error('Expected sequence');
    return data.map(function(item) {
        return this.parseField(field, item);
    }, this);
};

Protocol.prototype.parseStruct = function(field, data) {
    if (data.fields.length !== field.fields.length) throw new Error('struct has invalid length');
    var struct = {};
    field.fields.forEach(function(field, i) {
        struct[field.name] = this.parseField(field, data.fields[i]);
    }, this);
    return struct;
};

Protocol.prototype.parseUnion = function(field, data) {
    if (data.type !== 'union') throw new Error('expected union');
    var type = field.cases[data.id];
    if (!type) throw new Error('union case does not exist');
    var union = {};
    union[type.name] = this.parseField(type, data.value);
    return union;
};

Protocol.prototype.parseBinary = function(field, data) {
    if (!Buffer.isBuffer(data)) throw new Error('expected binary');
    return data;
};

Protocol.prototype.parseDouble = function(field, data) {
    if (data.type !== 'double') throw new Error('expected double');
    return data.value;
};

exports.Field = Field;
function Field(field) {
    this.name = field.name.value;
    this.type = field.type.value || field.type;
    if (field.type.base) this.base = field.type.base;
    if (field.optional) this.optional = field.optional;
}

exports.Message = Message;
function Message(id, fields) {
    this.id = id;
    this.fields = fields;
}

exports.Struct = Struct;
function Struct(id, fields) {
    this.kind = 'struct';
    if (id !== null) this.id = id;
    this.fields = fields;
}

exports.Sequence = Sequence;
function Sequence(type) {
    this.kind = 'sequence';
    this.type = type;
}

exports.Union = Union;
function Union(cases) {
    this.kind = 'union';
    this.cases = cases;
}
