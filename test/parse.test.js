var assert = require('assert');
var fs = require('fs');
var tdl = require('../lib/tdl');

var tests = {
    'empty': null,
    'empty-protocol': null,
    'calculator': null,
    'comments': null,
    'any-defined-by': null,
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
    'any-defined-by-missing': {
        message: 'Field "foo" references unknown field "M".',
        line: 7, column: 5
    },
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
    },
    'duplicate-message-ids': {
        message: 'Can\'t use ID 0 to define message Reply. It was previously used to define message Request on line 2, column 3.',
        line: 6, column: 3
    },
    'duplicate-protocol-ids': {
        message: 'Can\'t use ID 2 to define protocol EchoAnswer. It was previously used to define protocol Echo on line 1, column 1.',
        line: 7, column: 1
    },
    'duplicate-struct-ids-1': {
        message: 'Can\'t use ID 0 to define struct Reply. It was previously used to define struct Request on line 2, column 3.',
        line: 6, column: 3
    },
    'duplicate-struct-ids-2': {
        message: 'Can\'t use ID 0 to define struct Reply. It was previously used to define struct Request on line 1, column 1.',
        line: 5, column: 1
    }
};

for (var name in tests) (function(test, name) {
    exports[name] = function() {
        try {
            tdl.fromFile('test/fixtures/' + name + '.tdl');
        } catch (err) {
            var thrown = true;
            if (!test) throw err;
            assert.equal(test.message, err.message);
            assert.equal(test.line, err.line);
            assert.equal(test.column, err.column);
        }
        if (!thrown && test) {
            throw new Error('Expected error `' + test.message +
                '` on line ' + test.line + ', column ' + test.column);
        }
    };
})(tests[name], name);

