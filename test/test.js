'use strict';

require('mocha');
var fs = require('fs');
var path = require('path');
var assert = require('assert');
var generate = require('generate');
var npm = require('npm-install-global');
var del = require('delete');
var generator = require('..');
var app;

var actual = path.resolve.bind(path, __dirname, 'actual');

function exists(name, cb) {
  return function(err) {
    if (err) return cb(err);
    var filepath = actual(name);

    fs.stat(filepath, function(err, stat) {
      if (err) return cb(err);
      assert(stat);
      del(actual(), cb);
    });
  };
}

describe('generate-generator', function() {
  this.slow(250);

  if (!process.env.CI && !process.env.TRAVIS) {
    before(function(cb) {
      npm.maybeInstall('generate', cb);
    });
  }

  beforeEach(function() {
    app = generate({silent: true});
    app.cwd = actual();
    app.option('dest', actual());
    app.enable('skip-install');

    // pre-populate template data to avoid prompts from `ask` helper
    app.option('askWhen', 'not-answered');
    app.option('prompt', false);
    app.data(require('verb-repo-data'));
    app.data('testFile', 'foo.txt');
  });

  afterEach(function(cb) {
    del(actual(), cb);
  });

  describe('plugin', function() {
    it('should only register the plugin once', function(cb) {
      var count = 0;
      app.on('plugin', function(name) {
        if (name === 'generate-generator') {
          count++;
        }
      });
      app.use(generator);
      app.use(generator);
      app.use(generator);
      assert.equal(count, 1);
      cb();
    });

    it('should extend tasks onto the instance', function() {
      app.use(generator);
      assert(app.tasks.hasOwnProperty('default'));
      assert(app.tasks.hasOwnProperty('package'));
    });

    it('should run the `default` task with .build', function(cb) {
      app.use(generator);
      app.build('default', exists('package.json', cb));
    });

    it('should run the `default` task with .generate', function(cb) {
      app.use(generator);
      app.generate('default', exists('package.json', cb));
    });
  });

  if (!process.env.CI && !process.env.TRAVIS) {
    describe('generator (CLI)', function() {
      it('should run the default task using the `generate-generator` name', function(cb) {
        app.use(generator);
        app.generate('generate-generator', exists('package.json', cb));
      });

      it('should run the default task using the `generator` generator alias', function(cb) {
        app.use(generator);
        app.generate('generator', exists('package.json', cb));
      });
    });
  }

  describe('generator (API)', function() {
    it('should run the default task on the generator', function(cb) {
      app.register('generator', generator);
      app.generate('generator', exists('package.json', cb));
    });

    it('should run the `package` task', function(cb) {
      app.register('generator', generator);
      app.generate('generator:package', exists('package.json', cb));
    });

    it('should run the `default` task when defined explicitly', function(cb) {
      app.register('generator', generator);
      app.generate('generator:default', exists('package.json', cb));
    });
  });

  describe('sub-generator', function() {
    it('should work as a sub-generator', function(cb) {
      app.register('foo', function(foo) {
        foo.register('generator', generator);
      });
      app.generate('foo.generator', exists('package.json', cb));
    });

    it('should run the `default` task by default', function(cb) {
      app.register('foo', function(foo) {
        foo.register('generator', generator);
      });
      app.generate('foo.generator', exists('package.json', cb));
    });

    it('should run the `generator:default` task when defined explicitly', function(cb) {
      app.register('foo', function(foo) {
        foo.register('generator', generator);
      });
      app.generate('foo.generator:default', exists('package.json', cb));
    });

    it('should run the `generator:package` task', function(cb) {
      app.register('foo', function(foo) {
        foo.register('generator', generator);
      });
      app.generate('foo.generator:package', exists('package.json', cb));
    });

    it('should work with nested sub-generators', function(cb) {
      app
        .register('foo', generator)
        .register('bar', generator)
        .register('baz', generator);
      app.generate('foo.bar.baz', exists('package.json', cb));
    });
  });
});
