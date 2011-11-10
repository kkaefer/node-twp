var fs = require('fs');
var path = require('path');
var PEG = require('pegjs');

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

exports.Interface = Interface;
function Interface(input) {
    this.types = {};
    this.protocols = {};
    this.messages = {};
    this.identifiers = {};

    if (input) {
        this.add(input);
    }
}

Interface.prototype.add = function(input, filename) {
    try {
        var ast = parser.parse(input);

        this._currentInput = input;
        try {
            // At this point, the TDL file was parsed successfully.
            // Now we need to make sure it's semantically valid.
            ast.forEach(this.validateEntity, this);

            // Make sure that all typedefs have been defined later on.
            this.ensureDefined();
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

Interface.prototype.addFile = function(filename) {
    filename = path.resolve(filename);
    this.add(fs.readFileSync(filename, 'utf8'), filename);
};

Interface.prototype.position = function(pos) {
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

Interface.prototype.ensureDefined = function() {
    for (var identifier in this.identifiers) {
        var entity = this.identifiers[identifier];
        if (entity.kind === 'typedef') {
            var message = 'Type "' + entity.name.value + '" was declared but not defined.';
            throw new SemanticError(message, this.position(entity.pos));
        }
    }
};

Interface.prototype.declareIdentfier = function(entity) {
    var type = this.identifiers[entity.name.value];
    var typedef = entity.kind === 'typedef';
    if (type && (type.kind !== 'typedef' || typedef)) {
        var pos = this.position(type.pos);
        var message = 'Type "' + entity.name.value + '" ' + 'was already ' +
        (typedef ? 'declared' : 'defined as ' + type.kind) + ' ' +
        'on line ' + pos.line + ', column ' + pos.column + '.';
        throw new SemanticError(message, this.position(entity.pos));
    }
    this.identifiers[entity.name.value] = entity;
};

Interface.prototype.ensureType = function(name) {
    if (!this.types[name.value]) {
        var message = 'Type "' + name.value + '" is not declared.';
        throw new SemanticError(message, this.position(name.pos));
    }
};

Interface.prototype.validateEntity = function(entity) {
    this.declareIdentfier(entity);
    this['validate' + ucfirst(entity.kind)](entity);
}

Interface.prototype.validateProtocol = function(entity) {
    entity.elements.forEach(this.validateEntity, this);
    this.protocols[entity.name.value] = true;
};

Interface.prototype.validateTypedef = function(entity) {
    this.types[entity.name.value] = true;
};

Interface.prototype.validateSequence = function(entity) {
    this.ensureType(entity.contains);
    this.types[entity.name.value] = true;
};

Interface.prototype.validateField = function(field, locals) {
    var name = field.name.value;
    // Ensure that the name has not yet been taken.

    var previous = locals[name] || this.identifiers[name];
    if (previous) {
        var pos = this.position(previous.pos);
        var type = previous.type ? (previous.type.value || previous.type ) : previous.kind;
        var message = 'Can\'t redefine field "' + name + '". ' +
            'Previously declared as "' + type + '" ' +
            'on line ' + pos.line + ', column ' + pos.column + '.';
        throw new SemanticError(message, this.position(field.pos));
    }

    // Ensure that any-defined-by fields reference a valid field.
    if (field.type.references) {
        if (!locals[field.type.references]) {
            var message = 'Field "' + name + '" references unknown field "' + 
                field.type.references + '".';
            throw new SemanticError(message, this.position(field.pos));
        }
    }

    // Ensure that the referenced type has been declared. We only check
    // "complex" user-defined types that are a value/pos object.
    if (field.type.value) {
        this.ensureType(field.type);
    }

    locals[field.name.value] = field;
};

Interface.prototype.validateFields = function(fields) {
    var namespace = {};
    fields.forEach(function(field) {
        this.validateField(field, namespace);
    }, this);
};

Interface.prototype.validateStruct = function(entity) {
    this.validateFields(entity.fields);
    this.types[entity.name.value] = true;
};

Interface.prototype.validateUnion = function(entity) {
    this.validateFields(entity.cases);
    this.types[entity.name.value] = true;
};

Interface.prototype.validateMessage = function(entity) {
    this.validateFields(entity.fields);
    this.messages[entity.name.value] = true;
};
