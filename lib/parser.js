var fs = require('fs');
var path = require('path');
var PEG = require('pegjs');
var api = require('./api');

var grammar = fs.readFileSync(path.join(__dirname, 'tdl.pegjs'), 'utf8');
var parser = PEG.buildParser(grammar);

function ucfirst(str) {
    return str[0].toUpperCase() + str.substring(1);
}

// Copied from PEGJS' result.SyntaxError.
function SemanticError(message, pos) {
    this.name = 'SemanticError';
    this.message = message;
    this.line = pos.line;
    this.column = pos.column;
};

SemanticError.prototype = Error.prototype;

module.exports = Parser;
function Parser(input, filename) {
    this.types = {};
    this.protocols = {};
    this.messages = {};

    this.byName = {};
    this.byID = {};

    if (input) {
        this.add(input, filename);
    }
}

Parser.prototype.toJSON = function() {
    return {
        types: this.types,
        messages: this.messages,
        protocols: this.protocols
    }
};

Parser.prototype.add = function(input, filename) {
    try {
        var ast = parser.parse(input);

        this._currentInput = input;
        try {
            // At this point, the TDL file was parsed successfully.
            // Now we need to make sure it's semantically valid.
            ast.forEach(this.validateEntity, this);

            // Make sure that all typedefs have been defined later on.
            this.findIncomplete();
        } finally {
            delete this._currentInput;
        }
    } catch (err) {
        // Add .stack property
        if (!err.stack) {
            err.stack = err.name + ': ' + err.message +
                '\n    in ' + (filename || '[unknown file]') +
                ':' + err.line + ':' + err.column;
        }
        throw err;
    }
};

Parser.prototype.position = function(pos) {
    // Copied from PEGJS' computeErrorPosition() function.
    var input = this._currentInput;
    var line = 1;
    var column = 1;
    var seenCR = false;

    for (var i = 0; i < pos; i++) {
        var ch = input.charAt(i);
        if (ch === '\n') {
            if (!seenCR) { line++; }
            column = 1;
            seenCR = false;
        } else if (ch === '\r' | ch === '\u2028' || ch === '\u2029') {
            line++;
            column = 1;
            seenCR = true;
        } else {
            column++;
            seenCR = false;
        }
    }

    return { line: line, column: column };
}

// Finds typedefs that aren't followed by an actual definition.
Parser.prototype.findIncomplete = function() {
    for (var name in this.byName) {
        var entity = this.byName[name];
        if (entity.kind === 'typedef') {
            var message = 'Type "' + entity.name.value + '" was declared but not defined.';
            throw new SemanticError(message, this.position(entity.pos));
        }
    }
};

// Ensures that the name isn't yet used and reserves it for this entity.
Parser.prototype.validateName = function(entity) {
    var type = this.byName[entity.name.value];
    var typedef = entity.kind === 'typedef';
    if (type && (type.kind !== 'typedef' || typedef)) {
        var pos = this.position(type.pos);
        var message = 'Can\'t ' +
            (typedef ? 'redeclare' : 'redefine') +
            ' type "' + entity.name.value + '"' +
            (typedef ? '' : ' as ' + entity.kind) + '. ' +
            'Previously ' +
            (typedef ? 'declared' : 'defined as ' + type.kind) + ' ' +
            'on line ' + pos.line + ', column ' + pos.column + '.';
        throw new SemanticError(message, this.position(entity.pos));
    }
    this.byName[entity.name.value] = entity;
};

// Ensures that the ID isn't yet used for this entity's kind.
Parser.prototype.validateID = function(cur, namespace) {
    if (!namespace) namespace = this.byID;
    if (!namespace[cur.kind]) namespace[cur.kind] = {};
    if (namespace[cur.kind][cur.id]) {
        var prev = namespace[cur.kind][cur.id];
        var pos = this.position(prev.pos);
        var message = 'Can\'t use ID ' + cur.id + ' ' +
            'to define ' + cur.kind + ' ' + cur.name.value + '. ' +
            'It was previously used ' +
            'to define ' + prev.kind + ' ' + prev.name.value + ' ' +
            'on line ' + pos.line + ', column ' + pos.column + '.';
        throw new SemanticError(message, this.position(cur.pos));
    }
    namespace[cur.kind][cur.id] = cur;
};

// Ensures that the referenced type is declared or defined.
Parser.prototype.validateType = function(name) {
    if (name.value && name.value !== 'any' && !this.types[name.value]) {
        var message = 'Type "' + name.value + '" is not declared.';
        throw new SemanticError(message, this.position(name.pos));
    }
};

Parser.prototype.validateEntity = function(entity, namespace) {
    this.validateName(entity);
    this['validate' + ucfirst(entity.kind)](entity, namespace);
}

Parser.prototype.validateProtocol = function(entity) {
    this.validateID(entity);
    var messages = [];
    var namespace = {};
    entity.elements.forEach(function(entity) {
        this.validateEntity(entity, namespace);
        if (entity.kind === 'message') {
            messages.push(entity.name.value);
        }
    }, this);
    this.protocols[entity.name.value] = new api.Protocol(entity.id, messages);
};

Parser.prototype.validateTypedef = function(entity) {
    this.types[entity.name.value] = true;
};

Parser.prototype.validateSequence = function(entity) {
    this.validateType(entity.contains);
    this.types[entity.name.value] = new api.Sequence(entity.contains.value);
};

Parser.prototype.validateField = function(field, locals) {
    var name = field.name.value;
    // Ensure that the name has not yet been taken.

    var previous = locals[name] || this.byName[name];
    if (previous) {
        var pos = this.position(previous.pos);
        var type = previous.type ? (previous.type.value || previous.type ) : previous.kind;
        var message = 'Can\'t redefine field "' + name + '". ' +
            'Previously declared as "' + type + '" ' +
            'on line ' + pos.line + ', column ' + pos.column + '.';
        throw new SemanticError(message, this.position(field.pos));
    }

    // Ensure that any-defined-by fields reference a valid field.
    if (field.type.base) {
        if (!locals[field.type.base]) {
            var message = 'Field "' + name + '" references unknown field "' +
                field.type.base + '".';
            throw new SemanticError(message, this.position(field.pos));
        }
    }

    // Ensure that the referenced type has been declared. We only check
    // "complex" user-defined types that are a value/pos object.
    if (field.type.value) {
        this.validateType(field.type);
    }

    locals[field.name.value] = field;

    return new api.Field(field);
};

Parser.prototype.validateFields = function(fields, locals) {
    var contents = [];
    fields.forEach(function(field) {
        contents.push(this.validateField(field, locals));
    }, this);
    return contents;
};

Parser.prototype.validateStruct = function(entity) {
    this.validateID(entity);
    var fields = this.validateFields(entity.fields, {});
    this.types[entity.name.value] = new api.Struct(entity.id, fields);
};

Parser.prototype.validateMessage = function(entity, namespace) {
    this.validateID(entity, namespace);
    var fields = this.validateFields(entity.fields, {});
    this.messages[entity.name.value] = new api.Message(entity.id, fields);
};

Parser.prototype.validateUnion = function(entity) {
    var cases = {};
    var caseNumbers = {};
    entity.cases.forEach(function(field) {
        // Enforce unique case numbers.
        if (caseNumbers[field.number]) {
            var previous = caseNumbers[field.number];
            var pos = this.position(previous.pos);
            var type = previous.type.value || previous.type;
            var message = 'Case ' + field.number + ' was already used ' +
                'to define ' + type + ' ' + previous.name.value + ' ' +
                'on line ' + pos.line + ', column ' + pos.column + '.';
            throw new SemanticError(message, this.position(field.pos));
        }
        caseNumbers[field.number] = field;
        cases[field.number] = this.validateField(field, this.byName);
    }, this);
    this.types[entity.name.value] = new api.Union(cases);
};
