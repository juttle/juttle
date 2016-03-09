'use strict';


var Promise = require('bluebird');

var spawn = require('child-process-promise').spawn;
var juttleBin = 'bin/juttle';
var _ = require('underscore');

module.exports.runJuttle = function(args, options) {

    return new Promise(function(resolve, reject) {
        var stdout = '';
        var stderr = '';

        options = options || {};
        var spawnOptions;

        if (options.stdin) {
            spawnOptions = {
                stdio : ['pipe', 'pipe', 'pipe']
            };
        } else {
            spawnOptions = {
                stdio : [undefined, 'pipe', 'pipe']
            };
        }

        if (options.env) {
            spawnOptions.env = _.extend({}, process.env, options.env);
        }

        return spawn(juttleBin,
                     args,
                     spawnOptions)
            .progress(function (proc) {

                if (options && options.stdin) {
                    proc.stdin.write(options.stdin);
                }

                if (options.signalAfter) {
                    setTimeout(function() {
                        proc.kill(options.signalAfter.signal);
                    }, options.signalAfter.delay);
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
