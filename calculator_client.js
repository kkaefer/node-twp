var calculator = require('./calculator');

var parts = process.argv[2].split('.');

// 172.16.59.124
// var localhost = new Buffer([172, 16, 59, 124]);
var localhost = new Buffer([parts[0], parts[1], parts[2], parts[3]]);

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

calculator(expr, [], function(err, result) {
    if (err) throw err;
    console.warn('Result: ' + result);
});
