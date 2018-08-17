"use strict";

module.exports = exports = _package;

exports.usage = 'Packs binary (and enclosing directory) into locally staged tarball';

var fs = require('fs');
var path = require('path');
var log = require('npmlog');
var versioning = require('./util/versioning.js');
var napi = require('./util/napi.js');
var write = require('fs').createWriteStream;
var existsAsync = fs.exists || path.exists;
var mkdirp = require('mkdirp');
var tar = require('tar-fs');
var zlib = require('zlib');

function _package(gyp, argv, callback) {
    var packlist = require('npm-packlist');
    var package_json = JSON.parse(fs.readFileSync('./package.json'));
    var napi_build_version = napi.get_napi_build_version_from_command_args(argv);
    var opts = versioning.evaluate(package_json, gyp.opts, napi_build_version);
    var from = opts.module_path;
    var binary_module = path.join(from,opts.module_name + '.node');
    existsAsync(binary_module,function(found) {
        if (!found) {
            return callback(new Error("Cannot package because " + binary_module + " missing: run `node-pre-gyp rebuild` first"));
        }
        var tarball = opts.staged_tarball;
        var pack_log = function(entry) {
            if(entry.name) log.info('install','unpacking ' + entry.name);
        };
        mkdirp(path.dirname(tarball),function(err) {
            if (err) return callback(err);
            var basename = path.basename(from);
            packlist({ path: from }).then(function(entries) {
                tar.pack(from, {
                        entries: entries,
                        map: function(header) {
                            header.name = basename + '/' + header.name;
                            if(header.linkpath) header.linkpath = basename + '/' + header.linkpath;
                            return header;
                        }
                    })
                    .on('error', callback)
                    .on('entry', pack_log)
                    .pipe(zlib.createGzip())
                    .on('error', callback)
                    .pipe(fs.createWriteStream(tarball))
                    .on('error', callback)
                    .on('close', callback);
            }, callback);
        });
    });
}
