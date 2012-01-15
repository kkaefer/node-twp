var calculator = require('./calculator');

var localhost = new Buffer([127, 0, 0, 1]);

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

calculator(expr, function(err, result) {
    if (err) throw err;
    console.warn('Result: ' + result);
});
