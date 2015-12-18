var config = require('../../lib/config/read-config');
var expect = require('chai').expect;
var fse = require('fs-extra');
var path = require('path');
var tmp = require('tmp');

describe('read-config', function() {
    var tmpDir;
    var home;
    var cwd;

    beforeEach(function() {
        // new HOME environment value so tests don't mess with existing config
        tmpDir = tmp.dirSync().name;
        home = process.env.HOME;
        var newHome = path.join(tmpDir, 'HOME');
        fse.mkdirSync(newHome);
        process.env.HOME = newHome;

        // move to the new HOME location so the current working directory is
        // also isolated for each test
        cwd = process.cwd();
        var newCwd = path.join(tmpDir, 'CWD');
        fse.mkdirSync(newCwd);
        process.chdir(newCwd);
    });

    afterEach(function() {
        // clean up temp directory
        fse.removeSync(tmpDir);
        // set the HOME environment variable back
        process.env.HOME = home;
        process.chdir(cwd);
    });

    it('can handle no configs available', function() {
        expect(config()).to.deep.equal({});
    });

    it('fails when provided an invalid config.js file', function() {
        var configFilename = path.join(process.cwd(), '.juttle-config.js');
        fse.writeFileSync(configFilename, 'module.exports = { garbage };');
        expect(function() {
            config();
        }).to.throw(Error, 'Error parsing ' + configFilename);
    });

    it('fails when provided an invalid config.json file', function() {
        var configFilename = path.join(process.cwd(), '.juttle-config.json');
        fse.writeFileSync(configFilename, '{ garbage }');
        expect(function() {
            config();
        }).to.throw(Error, 'Error parsing ' + configFilename);
    });

    it('can read from a different location given config_path option', function() {
        var configFilename = path.join(process.cwd(), '.juttle-config.js');
        fse.writeFileSync(configFilename, 'module.exports = { foo: "bar" };');

        var tmpDir = tmp.dirSync().name;
        var otherConfigFilename = path.join(tmpDir, '.juttle-config.js');
        fse.writeFileSync(otherConfigFilename, 'module.exports = { foo: "baz" };');

        expect(config({config_path: otherConfigFilename})).to.deep.equal({
            foo: 'baz'
        });
    });

    it('can read config from <cwd>/.juttle-config.js file', function() {
        var configFilename = path.join(process.cwd(), '.juttle-config.js');
        fse.writeFileSync(configFilename, 'module.exports = { foo: "bar" };');

        expect(config()).to.deep.equal({
            foo: 'bar'
        });
    });

    it('can read config from <cwd>/.juttle-config.json file', function() {
        var configFilename = path.join(process.cwd(), '.juttle-config.json');
        fse.writeFileSync(configFilename, '{ "foo": "bar" }');

        expect(config()).to.deep.equal({
            foo: 'bar'
        });
    });

    it('can read config from HOME/.juttle/config.js file', function() {
        var juttleDir = path.join(process.env.HOME, '.juttle');
        fse.mkdirSync(juttleDir);
        var configFilename = path.join(juttleDir, 'config.js');
        fse.writeFileSync(configFilename, 'module.exports = { foo: "bar" };');

        expect(config()).to.deep.equal({
            foo: 'bar'
        });
    });

    it('can read config from HOME/.juttle/config.json file', function() {
        var juttleDir = path.join(process.env.HOME, '.juttle');
        fse.mkdirSync(juttleDir);
        var configFilename = path.join(juttleDir, 'config.json');
        fse.writeFileSync(configFilename, '{ "foo": "bar" }');

        expect(config()).to.deep.equal({
            foo: 'bar'
        });
    });
});
