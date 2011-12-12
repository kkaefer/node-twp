var TFS = require('./tfs');

var host = 'www.dcl.hpi.uni-potsdam.de';
var address = host;
var port = 80;

console.warn('Connecting to ' + address + ' on port ' + port);
var client = new TFS();
client.connect(port, address);


// client.listdir('', function(err, response) {
//     if (err) throw err;
//     console.warn(response);
// });

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

// client.monitor('', 1, '127.0.0.1', 22, function(err, handle) {
//     if (err) throw err;
//     console.warn(handle);
//     client.stop_monitoring(handle, function(err) {
//         if (err) throw err;
//         console.warn('removed');
//     });
// });
