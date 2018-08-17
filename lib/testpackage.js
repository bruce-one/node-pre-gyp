"use strict";

module.exports = exports = testpackage;

exports.usage = 'Tests that the staged package is valid';

var fs = require('fs');
var path = require('path');
var log = require('npmlog');
var existsAsync = fs.exists || path.exists;
var versioning = require('./util/versioning.js');
var napi = require('./util/napi.js');
var testbinary = require('./testbinary.js');
var tar = require('tar-fs');
var mkdirp = require('mkdirp');
var zlib = require('zlib');

function testpackage(gyp, argv, callback) {
    var package_json = JSON.parse(fs.readFileSync('./package.json'));
    var napi_build_version = napi.get_napi_build_version_from_command_args(argv);
    var opts = versioning.evaluate(package_json, gyp.opts, napi_build_version);
    var tarball = opts.staged_tarball;
    existsAsync(tarball, function(found) {
        if (!found) {
            return callback(new Error("Cannot test package because " + tarball + " missing: run `node-pre-gyp package` first"));
        }
        var to = opts.module_path;
        function extract_log(entry) {
            log.info('install','unpacking [' + entry.path + ']');
        }

        mkdirp(to, function(err) {
            if (err) {
                return callback(err);
            } else {
                fs.createReadStream(tarball)
                    .pipe(zlib.createGunzip())
                    .pipe(tar.extract(to, {
                        strip: 1,
                        onentry: extract_log
                    }))
                    .on('end', after_extract)
                    .on('error', callback);
            }
        });

        function after_extract() {
            testbinary(gyp,argv,function(err) {
                if (err) {
                    return callback(err);
                } else {
                    console.log('['+package_json.name+'] Package appears valid');
                    return callback();
                }
            });
        }
    });
}
