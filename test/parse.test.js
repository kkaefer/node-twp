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
        message: 'Type "Term" was already declared on line 2, column 3.',
        line: 3, column: 5
    },
    'redefinition-2': {
        message: 'Type "Term" was already defined as struct on line 3, column 3.',
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
    'comments': null
};

for (var name in tests) (function(test, name) {
    exports[name] = function() {
        try {
            new tdl.Interface().addFile('test/fixtures/' + name + '.tdl');
        } catch (err) {
            var thrown = true;
            if (!test) throw err;
            for (var key in test) {
                assert.equal(test[key], err[key]);
            }
        }
        if (!thrown && test) {
            throw new Error('Expected error ' + test.message);
        }
    };
})(tests[name], name);

