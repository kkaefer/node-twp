var dns = require('dns');
var TFS = require('./tfs');

dns.resolve('tfs.dcl.hpi.uni-potsdam.de', 'SRV', function(err, servers) {
    if (err) throw err;
    if (!servers.length) throw new Error('No known servers');

    var host = servers[0].name;
    var port = servers[0].port;

    var address = host;
    console.warn('Connecting to ' + address + ' on port ' + port);
    var client = new TFS();
    client.connect(port, address);


    client.listdir('', function(err, response) {
        if (err) throw err;
        console.warn(response);
        client.end();
    });

    // client.stat(['admin'], '', function(err, response) {
    //     if (err) throw err;
    //     console.warn(response);
    // });

    // client.rmdir('does_not_exist', function(err) {
    //     if (err) throw err;
    //     console.warn('done');
    // });

    // client.remove('', 'ZZZzzz.txt', function(err) {
    //     if (err) throw err;
    //     console.warn('done');
    // });

    // client.open('', 'newdemo.txt', 'w', function(err, fh) {
    //     if (err) throw err;
    //     console.warn('opened file');
    //     client.write(fh, new Buffer('this is the content'), function(err) {
    //         if (err) throw err;
    //         console.warn('written to file');
    //         client.close(fh);
    //     });
    // });

    // client.open('', 'newdemo.txt', 'r', function(err, fh) {
    //     if (err) throw err;
    //     console.warn('opened file');
    //     client.seek(fh, 3);
    //     client.read(fh, 1000, function(err, content) {
    //         if (err) throw err;
    //         console.warn(content.toString('utf8'));
    //         client.close(fh);
    //     });
    // });

    client.monitor('', 1, '141.89.89.60', 8000, function(err, handle) {
        if (err) throw err;
        console.warn('Monitoring enabled.');
        process.on('SIGINT', function() {
            console.warn('Disabling monitoring...');
            client.stop_monitoring(handle, function(err) {
                if (err) throw err;
                console.warn('Monitoring disabled');
                process.exit(0);
            });
        });
    });

});
