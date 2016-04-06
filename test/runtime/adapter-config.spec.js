'use strict';

var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;
var path = require('path');
var expect = require('chai').expect;
var _ = require('underscore');
var adapters = require('../../lib/runtime/adapters');

var PATH_TO_TEST_ADAPTER_CONF = './test/runtime/test-adapter-conf';
var ADAPTER_MODULE_RETRIEVER_FUNCTION = adapters.adapterModulePath;

function getAdapterModulePathFunction(forceConfigAdapter) {
    if (forceConfigAdapter) {
        return () => { return path.resolve(__dirname, '../runtime/test-adapter-conf'); };
    }
    return ADAPTER_MODULE_RETRIEVER_FUNCTION;
}

function configure(name, conf, forceAdapterPath) {
    var configurePayload = {};
    configurePayload[name] = conf;
    
    adapters.adapterModulePath = getAdapterModulePathFunction(forceAdapterPath);
    adapters.configure(configurePayload);
}

function getTestHostName() {
    return 'testHost' + Math.random().toString(36).slice(2,10);
}

describe('init and read from config', function () {
    
    it('load single object', function() {
        var inputConf = {
            host: getTestHostName()
        };
        var name = inputConf.host;
        configure(name, inputConf, true);
        
        return check_juttle({
            program: `read ${name}`
        })
        .then(function(result) {
            expect(result.sinks.table).to.have.length(1);
            
            var outputConf = result.sinks.table;
            expect(outputConf[0]).to.deep.equal(inputConf);
        });
    });
    
    it('load single object with path', function() {
        var inputConf = {
            host: getTestHostName(),
            path: PATH_TO_TEST_ADAPTER_CONF
        };
        var name = inputConf.host;
        configure(name, inputConf);
        
        return check_juttle({
            program: `read ${name}`
        })
        .then(function(result) {
            expect(result.sinks.table).to.have.length(1);
            
            var outputConf = result.sinks.table;
            var expectedOutput = _.omit(inputConf, 'path');
            expect(outputConf[0]).to.deep.equal(expectedOutput);
        });
    });
    
    it('load array', function() {
        var inputConf = [
            {
                id: 'first',
                host: getTestHostName()
            },
            {
                id: 'second',
                host: getTestHostName()
            }
        ];
        var name = inputConf[0].host;
        configure(name, inputConf, true);
        
        return check_juttle({
            program: `read ${name}`
        })
        .then(function(result) {
            expect(result.sinks.table).to.have.length(inputConf.length);
            
            var outputConf = result.sinks.table;
            expect(outputConf).to.deep.equal(inputConf);
        });
    });
    
    it('load conf under instances key', function() {
        var inputConf = { 
            instances: [
                {
                    id: 'first',
                    host: getTestHostName()
                },
                {
                    id: 'second',
                    host: getTestHostName()
                }
            ],
            path: PATH_TO_TEST_ADAPTER_CONF
        };
        var name = inputConf.instances[0].host;
        configure(name, inputConf);
        
        return check_juttle({
            program: `read ${name}`
        })
        .then(function(result) {
            expect(result.sinks.table).to.have.length(inputConf.instances.length);
            
            var outputConf = result.sinks.table;
            expect(outputConf).to.deep.equal(inputConf.instances);
        });
    });
    
    it('err missing id', function() {
        var inputConf = [
            {
                host: getTestHostName()
            },
            {
                id: 'second',
                host: getTestHostName()
            }
        ];
        var name = inputConf[0].host;
        configure(name, inputConf, true);
        
        return check_juttle({
            program: `read ${name}`
        })
        .then(function(result) {
            throw new Error('unexpected success');
        })
        .catch(function(err) {
            expect(err.message).equal(`One or more configuration instances for adapter ${name} is missing an id.`);
        });
    });
    
    it('err instances not array', function() {
        var inputConf = { 
            instances: {
                id: 'first',
                host: getTestHostName()
            },
            host: getTestHostName()
        };
        
        var name = inputConf.host;
        configure(name, inputConf, true);
        
        return check_juttle({
            program: `read ${name}`
        })
        .then(function(result) {
            throw new Error('unexpected success');
        })
        .catch(function(err) {
            expect(err.message).equal(`instances key in configuration for adapter ${name} must be an array.`);
        });
    });
    it('err path not indicated err', function() {
        var inputConf = { 
            instances: [
                {
                    id: 'first',
                    host: getTestHostName()
                },
                {
                    id: 'second',
                    host: getTestHostName()
                }
            ],
            path: './wrong-path/' 
        };
        
        var name = inputConf.instances[0].host;
        configure(name, inputConf);
        
        return check_juttle({
            program: `read ${name}`
        })
        .then(function(result) {
            throw new Error('unexpected success');
        })
        .catch(function(err) {
            expect(err.message).to.contain('Cannot find module');
            expect(err.message).to.contain('wrong-path/');
        });
    });
});
