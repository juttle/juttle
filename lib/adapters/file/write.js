'use strict';

var AdapterWrite = require('../../runtime/adapter-write');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var serializers = require('../serializers');

class WriteFile extends AdapterWrite {
    constructor(options, params) {
        super(options, params);

        this.filename = options.file;
        this.format = options.format ? options.format : 'json'; // default to json
        this.append = options.append;
    }

    static allowedOptions() {
        return ['file', 'format', 'append'];
    }

    static requiredOptions() {
        return ['file'];
    }

    start() {
        var options = {};
        var stream;
       
        if (this.append) {
            try {
                fs.accessSync(this.filename);
                options.append = true;
                if (this.format === 'csv') { 
                    // we need to provide the input stream for the csv format
                    options.input = fs.createReadStream(this.filename);
                }
            } catch (err) { 
                if (!err.toString().match(/ENOENT/))  {
                    throw err;
                }
            }
        }

        stream = fs.createWriteStream(this.filename, {
            flags: options.append ? 'a' : 'w'
        });

        this.serializer = serializers.getSerializer(this.format, stream, options);

        this.serializer.on('error', (err) => {
            // during write no fatal errors
            this.trigger('warning', err);
        });
    }

    write(points) {
        this.logger.debug('write', points);
        this.serializer.write(points);
    }

    eof() {
        return this.serializer.done();
    }
}

module.exports = WriteFile;
