var assert = require('assert');
var fs = require('fs');
var tdl = require('../tdl');

var tests = {
    'empty': null,
    'empty-protocol': null,
    'calculator': null,
    'missing-definition': {
        message: 'Type "Term" was declared but not defined.',
        line: 2, column: 3
    },
    'redefinition': {
        message: 'Can\'t redeclare type "Term". Previously declared on line 2, column 3.',
        line: 3, column: 5
    },
    'redefinition-2': {
        message: 'Can\'t redefine type "Term" as struct. Previously defined as struct on line 3, column 3.',
        line: 7, column: 3
    },
    'redefinition-3': {
        message: 'Can\'t redefine field "first". Previously declared as "int" on line 3, column 5.',
        line: 4, column: 5
    },
    'invalid-syntax': {
        message: 'Expected "message", "sequence", "struct", "typedef", "union" or "}" but "t" found.',
        line: 2, column: 3
    },
    'comments': null,
    'any-defined-by-missing': {
        message: 'Field "foo" references unknown field "M".',
        line: 7, column: 5
    },
    'any-defined-by': null,
    'sequence-missing': {
        message: 'Type "bar" is not declared.',
        line: 2, column: 12
    },
    'namespace-identifiers': {
        message: 'Can\'t redefine type "foo" as struct. Previously defined as case on line 3, column 5.',
        line: 8, column: 3
    },
    'union-case-numbers': {
        message: 'Case 3 was already used to define baz foo on line 4, column 5.',
        line: 5, column: 5
    }
};

for (var name in tests) (function(test, name) {
    exports[name] = function() {
        try {
            new tdl.Interface().addFile('test/fixtures/' + name + '.tdl');
        } catch (err) {
            var thrown = true;
            if (!test) throw err;
            assert.equal(test.message, err.message);
            assert.equal(test.line, err.line);
            assert.equal(test.column, err.column);
        }
        if (!thrown && test) {
            throw new Error('Expected error ' + test.message +
                ' on line ' + test.line + ', column ' + test.column);
        }
    };
})(tests[name], name);

