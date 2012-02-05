var fs = require('fs');
var signature = require('./lib/signature');

var cert = fs.readFileSync('cert.p12');
var data = fs.readFileSync('data.bin');
var sig = fs.readFileSync('signature.bin');


signature.p12toPEM(cert, '', function(err, pem) {
    if (err) throw err;

    var sig = signature.sign(data, pem)
    console.warn(sig.toString('base64'));
    console.warn(signature.verify(data, sig, pem));
});
