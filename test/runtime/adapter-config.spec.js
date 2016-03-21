'use strict';

var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;
var path = require('path');
var expect = require('chai').expect;
var _ = require('underscore');
var adapters = require('../../lib/runtime/adapters');


function configure(name, conf) {
    conf = _.clone(conf);
    conf.path = path.resolve(__dirname, '../runtime/test-adapter-conf');
    
    var configurePayload = {};
    configurePayload[name] = conf;
    
    adapters.configure(configurePayload);
}

describe('init and read from config', function () {
    
    it('load single object', function() {
        var inputConf = {
            host: 'testHostA'
        };
        var name = inputConf.host;
        configure(name, inputConf);
        
        return check_juttle({
            program: `read ${name}`
        })
        .then(function(result) {
            expect(result.sinks.table).to.have.length(1);
            
            var outputConf = result.sinks.table;
            expect(outputConf[0]).to.deep.equal(inputConf);
        });
    });
    
    it('load array', function() {
        var inputConf = [
            {
                id: 'first',
                host: 'testHost1'
            },
            {
                id: 'second',
                host: 'testHost2'
            }
        ];
        var name = inputConf[0].host;
        configure(name, inputConf);
        
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
                    host: 'testHost3'
                },
                {
                    id: 'second',
                    host: 'testHost4'
                }
            ] 
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
                host: 'testHost5'
            },
            {
                id: 'second',
                host: 'testHost6'
            }
        ];
        var name = inputConf[0].host;
        configure(name, inputConf);
        
        return check_juttle({
            program: `read ${name}`
        })
        .then(function(result) {
            throw new Error('unexpected success');
        })
        .catch(function(err) {
            expect(err.message).equal(`One or more configuation instances for adapter ${name} is missing an id.`);
        });
    });
    
    it('err instances not array', function() {
        var inputConf = { 
            instances: {
                id: 'first',
                host: 'testHost7'
            },
            host: 'hostPlaceholder1'
        };
        
        var name = inputConf.host;
        configure(name, inputConf);
        
        return check_juttle({
            program: `read ${name}`
        })
        .then(function(result) {
            throw new Error('unexpected success');
        })
        .catch(function(err) {
            expect(err.message).equal(`instances key in configuation for adapter ${name} must be an array.`);
        });
    });
});
