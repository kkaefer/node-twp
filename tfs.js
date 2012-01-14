var tdl = require('./lib/api');
var twp = require('./lib/twp');

var api = tdl.fromFile('./misc/rpc.tdl');

function formatDir(dir) {
    return Array.isArray(dir) ?
        dir :
        dir.split('/').filter(function(part) { return part !== ''; });
}

function formatIP(input) {
    // Regular expressions are from node.js' lib/net_uv.js
    if (/^(\d?\d?\d)\.(\d?\d?\d)\.(\d?\d?\d)\.(\d?\d?\d)$/.test(input)) {
        var parts = input.split('.');
        var output = new Buffer(4);
        for (var i = 0; i < parts.length; i++) {
            output[i] = parseInt(parts[i], 10);
        }
        return output;
    } else if (/^::|^::1|^([a-fA-F0-9]{1,4}::?){1,7}([a-fA-F0-9]{1,4})$/.test(input)) {
        var output = new Buffer(16);
        output.fill(0);
        var parts = input.split(':');
        for (var i = 0, j = 0; i < parts.length; i++, j++) {
            if (parts[i] === '') {
                j += 8 - parts.length;
                // Avoid double jumps
                if (j >= 8) return null;
            } else {
                output.writeUInt16BE(parseInt(parts[i], 16), j * 2);
            }
        }
        return output;
    } else {
        return null;
    }
}

module.exports = TFS;
function TFS(port, address) {
    this.client = new twp.Client(api.protocols.byName['RPC']);

    this._id = 0;
    this._queue = [];
    this._pending = {};
    this.client.on('connect', function() {
        this._connected = true;
        this._processQueue();
    }.bind(this));

    this.client.on('message', this._processMessage.bind(this));
}

TFS.prototype.connect = function(port, address) {
    this.client.connect(port, address);
};

TFS.prototype._processQueue = function() {
    if (!this._connected) return;
    var task;
    while (task = this._queue.shift()) {
        task.request_id = this._id++;
        if (typeof task.response_expected === 'undefined') {
            task.response_expected = typeof task.callback === 'function' ? 1 : 0;
        }
        if (typeof task.parameters === 'undefined') {
            task.parameters = null;
        }
        this.client.send('Request', task);
        this._pending[task.request_id] = task;
    }
};

TFS.prototype._processMessage = function(name, content) {
    if (name === 'Reply') {
        var task = this._pending[content.request_id];
        if (!task) {
            console.warn('Received unexpected Reply for ID ' + content.request_id);
            return;
        }

        if (!content.result) {
            task.callback(null);
        } else if (content.result.id === 3) {
            task.callback(new Error(content.result.fields[0]));
        } else {
            task.callback(null, content.result);
        }
        delete this._pending[content.request_id];
    } else if (name === 'CloseConnection') {
        this.client.close();
        console.warn('closing connect');
    } else {
        console.warn(name, content);
    }
};

TFS.prototype._run = function(cmd) {
    this._queue.push(cmd);
    this._processQueue();
};

TFS.prototype.listdir = function(dir, fn) {
    this._run({
        operation: 'listdir',
        parameters: formatDir(dir),
        callback: function(err, content) {
            if (err) fn(err);
            else fn(null, {
                directories: content.fields[0],
                files: content.fields[1]
            });
        }
    });
};

TFS.prototype.stat = function(dir, file, fn) {
    this._run({
        operation: 'stat',
        parameters: { type: 'struct', fields: [ formatDir(dir), file ] },
        callback: function(err, content) {
            if (err) fn(err);
            else fn(null, {
                size: content.fields[0],
                mtime: content.fields[1],
                atime: content.fields[2]
            });
        }
    });
};

TFS.prototype.mkdir = function(dir, fn) {
    this._run({
        operation: 'mkdir',
        parameters: formatDir(dir),
        callback: fn
    });
};

TFS.prototype.rmdir = function(dir, fn) {
    this._run({
        operation: 'rmdir',
        parameters: formatDir(dir),
        callback: fn
    });
};

TFS.prototype.remove = function(dir, file, fn) {
    this._run({
        operation: 'remove',
        parameters: { type: 'struct', fields: [ formatDir(dir), file ] },
        callback: fn
    });
};

TFS.prototype.open = function(dir, file, mode, fn) {
    if (typeof mode === 'function') {
        fn = mode;
        mode = 0;
    }
    if (typeof mode === 'string') {
        if (mode === 'w') mode = 1;
        else if (mode === 'a') mode = 2;
        else mode = 0;
    }

    this._run({
        operation: 'open',
        parameters: { type: 'struct', fields: [ formatDir(dir), file, mode ] },
        callback: fn
    });
};

TFS.prototype.write = function(fh, data, fn) {
    this._run({
        operation: 'write',
        parameters: { type: 'struct', fields: [ fh, data ] },
        callback: fn
    });
};

TFS.prototype.read = function(fh, count, fn) {
    this._run({
        operation: 'read',
        parameters: { type: 'struct', fields: [ fh, count ] },
        callback: fn
    });
};

TFS.prototype.seek = function(fh, pos, fn) {
    this._run({
        operation: 'seek',
        parameters: { type: 'struct', fields: [ fh, pos ] },
        callback: fn
    });
};

TFS.prototype.close = function(fh) {
    this._run({
        operation: 'close',
        parameters: fh
    });
};

TFS.prototype.monitor = function(dir, recursive, host, port, fn) {
    this._run({
        operation: 'monitor',
        parameters: {
            type: 'struct',
            fields: [ formatDir(dir), recursive, formatIP(host), port ]
        },
        callback: fn
    });
};

TFS.prototype.stop_monitoring = function(handle, fn) {
    this._run({
        operation: 'stop_monitoring',
        parameters: handle,
        callback: fn
    });
};

TFS.prototype.end = function() {
    this.client.close();
};
