var Client = require('./lib/client');
var api = require('./lib/tdl').fromFiles(['./misc/echo.tdl', './misc/certificate.tdl']);
var Signature = require('./lib/signature');

if (process.argv.length !== 3) {
    console.warn('Usage: ' + process.env._ + ' "string"');
    process.exit(1);
}

var host = 'www.dcl.hpi.uni-potsdam.de';
var address = host;
var port = 80;

var fs = require('fs');
var signature = require('./lib/signature');
signature.p12toPEM(fs.readFileSync('kk.p12'), '', function(err, pem) {
    var client = new Client(api.protocols.Echo);

    console.warn('Connecting to ' + address + ' on port ' + port);
    client.connect(port, address);

    client.on('connect', function() {
        var string = process.argv[2];
        console.warn('Measuring "' + string + '"');

        var cer = signature.PEMtoCER(pem);
        var der = signature.CERtoDER(cer);
        client.sendCertificate({ data: der });
        client.sendRequest({ text: string }, pem);



        var serverCertificate;
        client.on('message', function(name, content, extensions, buffer) {
            if (name === 'Certificate') {
                serverCertificate = Signature.DERtoCER(content.data);
            } else {
                var signature = extensions[0].data.data;
                var fields = buffer.slice(buffer[0] == 12 ? 5 : 1, extensions[0].offset)

                var valid = Signature.verify(fields, signature, serverCertificate);
                if (!valid) {
                    console.warn('answer invalid');
                } else {
                    console.warn('answer valid');
                    console.warn(name, content);
                }
                client.close();
            }
        });
    });
});


