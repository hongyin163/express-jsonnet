var fs = require('fs');
var path = require('path');
// var jsonnet = require('node-addon-jsonnet');
var http = require('axios');
var parseurl = require('parseurl');
var plugmanger = require('./src/plugins_manager');
var transformer_factory = require('./src/transformer_factory');
var router = require('./src/router');
var _ = require('lodash');

exports.cache = {};



exports.renderFile = function (path, options, fn) {
    options = options || {};
    transformer.transformFile(path, options, function (err, data) {
        if (err) {
            fn(err);
        } else {
            fn(null, data);
        }
    });
};


function getDataFormSource(src, callback) {

    if (typeof src == 'object') {
        return callback && callback(null, src);
    }

    if (typeof src == 'string') {
        var srctype = src.substring(0, src.indexOf('://'))
        var func = plugmanger.get(srctype);
        if (func) {
            return func(src, callback)
        } else {
            throw new Error('Not find data source plugin :' + srctype);
        }
    }
    if (typeof src == 'function') {
        return src(callback);
    }
    return callback && callback(null, src);
}

var results = {};
function handler(source, callback) {
    if (source.length > 0) {
        var last = source.pop();
        getDataFormSource(last.src, function (err, data) {
            if (err) {
                results[last.name] = { "error": err.message };
            } else {
                results[last.name] = data;
            }
            handler(source, callback)
        });
    } else {
        callback && callback(results);
    }
}

var transformer;
_.templateSettings.interpolate = /{([\s\S]+?)}/g;
// var compiled = _.template('hello {{ user }}!');
function createRoute(options) {
    options = options || {};
    var routeFile = options.routeFile;

    var config = require(routeFile);
    var configFolder = path.dirname(routeFile);
    var tplPath = path.resolve(__dirname, options.jsonFolder || '');
    var srcPath = path.resolve(__dirname, options.srcFolder || '');

    return function (req, res, next) {
        var pathname = parseurl(req).pathname;
        if (!router.match(config, pathname)) {
            return next();
        }

        var tpl = config[router.path]['tpl'];
        var src = config[router.path]['data'];

        if (!tpl && !src) {
            return res.send("Not config data source and data template");
        }

        transformer = transformer_factory.create(path.extname(tpl));

        //only have jsonnet tpl
        if (tpl && !src) {
            return exports.renderFile(path.resolve(configFolder, tpl), null, function (err, coderesult) {
                res.setHeader('Content-Type', 'application/json');
                if (!err) {
                    res.send(coderesult);
                } else {
                    res.statusCode = '505';
                    res.send({ message: err.message });
                }
            });
        }
        //获取数据源配置
        var source = require(path.resolve(configFolder, src));
        var srcArray = [];
        for (var pro in source) {

            var srcdata = source[pro];
            if (typeof srcdata == 'string') {
                srcdata = _.template(srcdata)(router.params);
            }

            srcArray.push({ name: pro, src: srcdata });
        }

        results = {}
        try {
            handler(srcArray, function (data) {
                if (!tpl) {
                    return res.send(data);
                }

                exports.renderFile(path.resolve(configFolder, tpl), data, function (err, coderesult) {
                    res.setHeader('Content-Type', 'application/json');
                    if (!err) {
                        res.send(coderesult);
                    } else {
                        res.statusCode = '505';
                        res.send({ message: err.message });
                    }
                });

            });
        } catch (ex) {
            res.statusCode = '505';
            res.send({ message: ex.message });
        }
    }
}

exports.__express = function (path, options, fn) {
    if (options.compileDebug == undefined && process.env.NODE_ENV === 'production') {
        options.compileDebug = false;
    }
    exports.renderFile(path, options, fn);
}

exports.__jsonnet = createRoute;

exports.registPlugin = function (key, func) {
    plugmanger.set(key, func);
}