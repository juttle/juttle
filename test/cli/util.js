'use strict';


var Promise = require('bluebird');

var spawn = require('child-process-promise').spawn;
var juttleBin = 'bin/juttle';

module.exports.runJuttle = function(args, options) {

    return new Promise(function(resolve, reject) {
        var stdout = '';
        var stderr = '';

        var spawnOptions;

        if (options && options.stdin) {
            spawnOptions = {
                stdio : ['pipe', 'pipe', 'pipe']
            };
        } else {
            spawnOptions = {
                stdio : [undefined, 'pipe', 'pipe']
            };
        }

        return spawn(juttleBin,
                     args,
                     spawnOptions)
            .progress(function (proc) {

                if (options && options.stdin) {
                    proc.stdin.write(options.stdin);
                }

                proc.stdout.on('data', function (data) {
                    stdout += data;
                });

                proc.stderr.on('data', function (data) {
                    stderr += data;
                });

                proc.on('close', function(code) {
                    resolve({
                        stdout: stdout,
                        stderr: stderr,
                        code: code
                    });
                });
            })
            .catch(function(err) {
                reject(err);
            });
    });
};
