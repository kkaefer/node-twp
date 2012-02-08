var rl = require('readline');
var fs = require('fs');
var calculator = require('./calculator');

if (process.argv.length !== 4) {
    console.warn('Usage: ' + process.env._ + ' [ip] [key]');
    process.exit(1);
}

var parts = process.argv[2].split('.');
var localhost = new Buffer([parts[0], parts[1], parts[2], parts[3]]);
var key = fs.readFileSync(process.argv[3]);

var expr = {
    host: localhost,
    port: 9002,
    arguments: [
        { expr: {
            host: localhost,
            port: 9001,
            arguments: [
                { expr: {
                    host: localhost,
                    port: 9003,
                    arguments: [
                        { value: 6 }
                    ]
                }},
                { value: 3 }
            ]
        }},
        { value: 4 }
    ]
}

var input = rl.createInterface(process.stdin, process.stdout, null);
input.question("Key password: ", function(password) {
    input.close();

    calculator(expr, [], function(err, result) {
        if (err) throw err;
        console.warn('Result: ' + result);
    }, {
        key: key,
        password: password
    });
});
