var fs = require('fs');
var path = require('path');
var Parser = require('./parser');

exports.fromString = function(str, name) {
    var parser = new Parser(str, name);
    return parser.toJSON();
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
    return parser.toJSON();
};

exports.Protocol = Protocol;
function Protocol(id, messages) {
    this.id = id;
    this.messages = messages;
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
    var definition = this.api.messages[name];
    if (!definition) {
        throw new Error('Unknown message name "' + name + '"');
    }

    var message = {
        id: definition.id,
        fields: []
    };

    return message;
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
