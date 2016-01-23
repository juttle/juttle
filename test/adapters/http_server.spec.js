var expect = require('chai').expect;
var request = require('request-promise');

var juttle_test_utils = require('../runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;
var run_juttle = juttle_test_utils.run_juttle;
var compile_juttle = juttle_test_utils.compile_juttle;

describe.skip('read http_server', function() {
    it('ingests simple json array', function() {
        var programFinish, program;
        var body = [
            { 'name': 'ted', 'age': 53, 'weight': 100},
            { 'name': 'ted', 'age': 53, 'weight': 100}
        ];

        return compile_juttle({
            program: 'read http_server'
        })
        .then(function(prog) {
            program = prog;
            programFinish = run_juttle(prog);

            return request({
                uri: 'http://localhost:8080',
                method: 'POST',
                body: body,
                json: true
            });
        })
        .then(function() {
            program.deactivate();
            return programFinish;
        })
        .then(function(result) {
            expect(result.sinks.table).to.deep.equal(body);
            expect(result.errors.length).equal(0);
            expect(result.warnings.length).equal(0);
        });
    });

    it('ingests singular json object', function() {
        var programFinish, program;
        var body = { 'name': 'ted', 'age': 53, 'weight': 100};

        return compile_juttle({
            program: 'read http_server -port 2000'
        })
        .then(function(prog) {
            program = prog;
            programFinish = run_juttle(program);

            return request({
                uri: 'http://localhost:2000',
                method: 'POST',
                body: body,
                json: true,
                resolveWithFullResponse: true
            });
        })
        .then(function(res) {
            expect(res.statusCode).to.equal(200);

            program.deactivate();
            return programFinish;
        })
        .then(function(results) {
            expect(results.sinks.table[0]).to.deep.equal(body);
        });
    });

    it('ingests with put method', function() {
        var programFinish, program;
        var body = {'name': 'ted', 'age': 53, 'weight': 100};

        return compile_juttle({
            program: 'read http_server -port 2000 -method \'PUT\''
        })
        .then(function(prog) {
            program = prog;
            programFinish = run_juttle(program);

            return request({
                uri: 'http://localhost:2000',
                method: 'PUT',
                body: body,
                json: true,
                resolveWithFullResponse: true
            });
        })
        .then(function(res) {
            expect(res.statusCode).to.equal(200);

            program.deactivate();
            return programFinish;
        })
        .then(function(results) {
            expect(results.sinks.table).to.deep.equal([body]);
        });
    });

    it('ingests simple csv, verify timeField works correctly', function() {
        var program, finish;
        var body = 'product,amount,saleTime'
            + '\nNike Shoes,1000.00,2016-01-16'
            + '\nRed Dragon,35.06,2016-01-17';

        return compile_juttle({
            program: 'read http_server -port 2000 -timeField "saleTime"'
        })
        .then(function(prog) {
            program = prog;
            finish = run_juttle(program);

            return request({
                uri: 'http://localhost:2000',
                method: 'POST',
                headers: { 'Content-Type': 'text/csv' },
                body: body
            });
        })
        .then(function() {
            program.deactivate();
            return finish;
        })
        .then(function(results) {
            expect(results.sinks.table.length).to.equal(2);
            expect(results.sinks.table[0].product).to.equal('Nike Shoes');

            // verify time has been parsed
            expect(results.sinks.table[0].time).to.equal('2016-01-16T00:00:00.000Z');
        });
    });

    it('correctly handles rootPath option', function() {
        var program, finish;
        return compile_juttle({
            program: 'read http_server -port 2000 -rootPath \'root.root\''
        })
        .then(function(prog) {
            program = prog;
            finish = run_juttle(program);

            return request({
                uri: 'http://localhost:2000',
                method: 'POST',
                json: true,
                body: { root: { root: { actual_root: true }}}
            });
        })
        .then(function() {
            program.deactivate();
            return finish;
        })
        .then(function(results) {
            expect(results.sinks.table).to.deep.equal([{ actual_root: true }]);
        });
    });

    it('invalid content type returns error', function() {
        var program, finish;
        var json_body = JSON.stringify([{person: 'matt', awesome_rating: 100}]);

        return compile_juttle({
            program: 'read http_server -port 2000'
        })
        .then(function(prog) {
            program = prog;
            finish = run_juttle(program);

            // invalid content-type
            return request({
                uri: 'http://localhost:2000',
                method: 'POST',
                headers: { 'Content-Type': 'text/html' },
                body: json_body,
                simple: false, // don't throw error on 400 status code
                resolveWithFullResponse: true
            });
        })
        .then(function(res) {
            expect(res.statusCode).to.equal(415);

            // no content-type
            return request({
                uri: 'http://localhost:2000',
                method: 'POST',
                body: json_body,
                simple: false,
                resolveWithFullResponse: true
            });
        })
        .then(function(res) {
            expect(res.statusCode).to.equal(415);

            program.deactivate();
            return finish;
        })
        .then(function(results) {
            expect(results.errors.length).to.equal(2);
        });
    });

    it('invalid csv returns error', function() {
        var program, finish;
        var invalid_body = 'product,amount,saleTime'
            + '\nNike Shoes, 35.06, 2016-01-20'
            + '\nRed Dragon, 24.04';

        return compile_juttle({
            program: 'read http_server -port 2000 -timeField \'saleTime\''
        })
        .then(function(prog) {
            program = prog;
            finish = run_juttle(program);

            return request({
                uri: 'http://localhost:2000',
                method: 'POST',
                headers: { 'Content-Type': 'text/csv' },
                body: invalid_body,
                simple: false,
                resolveWithFullResponse: true
            });
        })
        .then(function(res) {
            expect(res.statusCode).to.equal(400);

            program.deactivate();
            return finish;
        })
        .then(function(results) {
            expect(results.errors.length).to.equal(1);
            expect(results.sinks.table.length).to.equal(0);
        });
    });

    it('error request should not kill program', function() {
        var program, finish;
        return compile_juttle({
            program: 'read http_server -port 2000'
        })
        .then(function(prog) {
            program = prog;
            finish = run_juttle(program);

            return request({
                uri: 'http://localhost:2000',
                method: 'POST',
                body: JSON.stringify({ error: 'error' }),
                simple: false,
                resolveWithFullResponse: true
            });
        })
        .then(function(res) {
            expect(res.statusCode).to.equal(415);

            return request({
                uri: 'http://localhost:2000',
                method: 'POST',
                body: { ok: 'ok' },
                json: true
            });
        })
        .then(function() {
            program.deactivate();
            return finish;
        })
        .then(function(results) {
            expect(results.sinks.table.length).to.equal(1);
            expect(results.errors.length).to.equal(1);
        });
    });

    it('invalid method returns 404', function() {
        var program, finish;

        return compile_juttle({
            program: 'read http_server -port 2000'
        })
        .then(function(prog) {
            program = prog;
            finish = run_juttle(program);

            return request({
                uri: 'http://localhost:2000',
                method: 'GET',
                simple: false,
                resolveWithFullResponse: true,
            });
        })
        .then(function(res) {
            expect(res.statusCode).to.equal(404);

            program.deactivate();
            return finish;
        });
    });

    it('unsupport method throws error', function() {
        return check_juttle({
            program: 'read http_server -port 2000 -method \'HEAD\''
        })
        .then(function() {
            throw new Error('the previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('Error: Invalid method option value, must be one');
        });
    });

    it('unsupported option throws error', function() {
        return check_juttle({
            program: 'read http_server -unknown true'
        })
        .then(function() {
            throw new Error('the previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('unknown read http_server option unknown.');
        });
    });
});
