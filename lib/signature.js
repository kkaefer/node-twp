var crypto = require('crypto');
var child_process = require('child_process');

exports.p12toPEM = function(cert, pass, callback) {
    var convert = child_process.spawn('openssl', ['pkcs12', '-nodes', '-passin', 'stdin']);
    var error = '', result = '';
    convert.stdout.on('data', function(data) { result += data.toString('ascii'); });
    convert.stderr.on('data', function(data) { error += data.toString('ascii'); });
    convert.on('exit', function(code) {
        if (code) callback(new Error(error || code));
        else callback(null, result);
    });

    convert.stdin.write(pass);
    convert.stdin.write('\n');
    convert.stdin.write(cert);
    convert.stdin.end();
};

exports.sign = function(message, pem) {
    var signer = crypto.createSign('RSA-SHA1');
    signer.update(message);
    return new Buffer(signer.sign(pem, 'hex'), 'hex');
};

exports.PEMtoCER = function(pem) {
    return pem.match(/-----BEGIN CERTIFICATE-----\n[a-zA-Z0-9\/=+\n]+?\n-----END CERTIFICATE-----/g)[0];
};

exports.CERtoDER = function(cer) {
    var cert = cer.match(/\s*-----BEGIN CERTIFICATE-----\n([a-zA-Z0-9\/=+\n]+)\n-----END CERTIFICATE-----\s*/)[1];
    return new Buffer(cert.replace(/\n/g, ''), 'base64');
};

exports.DERtoCER = function(der) {
    return '-----BEGIN CERTIFICATE-----\n' + der.toString('base64').replace(/(.{64})/g, '$1\n') + '\n-----END CERTIFICATE-----';
};

exports.verify = function(message, signature, pem) {
    if (!Buffer.isBuffer(signature)) throw new Error('signature must be a buffer');
    var verifier = crypto.createVerify('RSA-SHA1');
    verifier.update(message);
    return verifier.verify(pem, signature.toString('hex'), 'hex')
}