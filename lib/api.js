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

    var message = {
        type: 'message',
        id: definition.id,
        fields: []
    };

    definition.fields.forEach(function(field) {
        if (field.type === 'string' || field.type === 'int' || field.type === 'any') {
            message.fields.push(data[field.name]);
        } else {
            // TODO: optional fields, complex types
            throw new Error('not implemented');
        }
    });

    return message;
};

Protocol.prototype.parseMessage = function(message) {
    var definition = this.messages.byID[message.id];
    if (!definition) {
        throw new Error('Unknown message name "' + name + '"');
    }

    var data = {};
    definition.fields.forEach(function(field) {
        // TODO: optional fields, complex types
        data[field.name] = message.fields.shift();
    });

    return { name: definition.name, data: data }
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
