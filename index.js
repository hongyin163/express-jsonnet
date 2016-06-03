var fs = require('fs');
var path = require('path');
// var jsonnet = require('node-addon-jsonnet');
var parseurl = require('parseurl');
var adapter_manager = require('./src/adapters_manager');
var transformer_factory = require('./src/transformer_factory');
var router = require('./src/router');
var _ = require('lodash');
var __cache = {};

var default_cache = {
    set: function (key, value) {
        key = key.replace(/[\/,\?=]/g, '');
        __cache[key] = value;
    },
    get: function (key, callback) {
        key = key.replace(/[\/,\?=]/g, '');
        var result = __cache[key];
        if (result)
            callback && callback(null, result);
        else
            callback && callback(new Error('cache err'));
    }
};

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
        var func = adapter_manager.get(srctype);
        if (func) {
            return func(src, __options, callback)
        } else {
            throw new Error('Not find data source adapter :' + srctype);
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
var __options = {
    cache: default_cache,
    routeFile: __dirname,
    enalbeCache: true
};
function create_route(options) {
    __options = Object.assign(__options, options);

    __options['routeConfig'] = require(__options.routeFile);
    __options['configFolder'] = path.dirname(__options.routeFile);
    // var tplPath = path.resolve(__dirname, options.jsonFolder || '');
    // var srcPath = path.resolve(__dirname, options.srcFolder || '');

    return function (req, res, next) {
        req['pathname'] = parseurl(req).pathname;
        if (!router.match(__options.routeConfig, req.pathname)) {
            return next();
        }

        if (__options.enalbeCache) {
            __options.cache.get(req.pathname, function (err, result) {
                if (result) {
                    res.setHeader('data_from', 'cache');
                    return res.send(result);
                } else {                   
                    handle_request(req, res, next)
                }
            });
        } else {
            handle_request(req, res, next)
        }
    }
}

function handle_request(req, res, next) {
    var pathname = req.pathname;
    var routeConfig = __options.routeConfig;
    var configFolder = __options.configFolder;
    var tpl = routeConfig[router.route_path]['tpl'];
    var src = routeConfig[router.route_path]['data'];

    if (!tpl && !src) {
        return res.send("Not config data source and data template");
    }
    var tplFilePath = '', dataFilePath = '';
    //only have jsonnet tpl
    if (tpl && !src) {
        tplFilePath = path.resolve(configFolder, tpl);
        transformer = transformer_factory.create(path.extname(tpl));
        return exports.renderFile(tplFilePath, null, function (err, coderesult) {
            res.setHeader('Content-Type', 'application/json');
            if (!err) {
                res.send(coderesult);
                __options.enalbeCache && __options.cache.set(pathname, coderesult);
            } else {
                res.statusCode = '505';
                res.send({ message: err.message });
            }
        });
    }
    //have src
    dataFilePath = path.resolve(configFolder, src);
    //获取数据源配置
    var source = require(dataFilePath);
    var srcArray = [];
    for (var pro in source) {
        var srcdata = source[pro];
        if (typeof srcdata == 'string') {
            srcdata = _.template(srcdata)(Object.assign(__options, router.params));
        }
        srcArray.push({ name: pro, src: srcdata });
    }

    results = {}
    try {
        handler(srcArray, function (data) {
            //only src
            if (!tpl) {
                return res.send(data);
            }
            //tpl and src 
            tplFilePath = path.resolve(configFolder, tpl);
            transformer = transformer_factory.create(path.extname(tpl));
            exports.renderFile(tplFilePath, data, function (err, coderesult) {
                res.setHeader('Content-Type', 'application/json');
                if (!err) {
                    res.send(coderesult);
                    __options.enalbeCache && __options.cache.set(pathname, coderesult);
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


exports.__express = function (path, options, fn) {
    if (options.compileDebug == undefined && process.env.NODE_ENV === 'production') {
        options.compileDebug = false;
    }
    exports.renderFile(path, options, fn);
}

exports.__jsonnet = create_route;

exports.regist_adapter = function (key, func) {
    adapter_manager.set(key, func);
}