var fs = require('fs');
var path = require('path');
var Parser = require('./parser');

exports.fromString = function(str, name) {
    var parser = new Parser(str, name);
    return new Interface(parser);
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
    return new Interface(parser);
};

exports.Interface = Interface;
function Interface(parser) {
    this.protocols = {};

    for (var name in parser.protocols) {
        var protocol = parser.protocols[name];
        protocol.interface = this;
        this.protocols[protocol.name] = protocol;
        this.protocols[protocol.id] = protocol;
    }

    // Only expose registered types, that are outside of a protocol.
    this.types = {};
    for (var name in parser.types) {
        var type = parser.types[name];
        if (typeof type.id !== 'undefined' && type.id !== null) {
            this.types[type.name] = type;
            this.types[type.id] = type;
        }
    }

    this.messages = {};
    for (var name in parser.messages) {
        var message = parser.messages[name];
        // Add globally registered messages to all protocols
        for (var name in this.protocols) {
            this.protocols[name].messages[message.name] = message;
            this.protocols[name].messages[message.id] = message;
        }
        // And as top level objects.
        this.messages[message.name] = message;
        this.messages[message.id] = message;
    }
}

Interface.prototype.createClient = function(protocol) {
    
};
