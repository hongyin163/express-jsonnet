var fs = require('fs');
var path = require('path');
var jsonnet = require('node-addon-jsonnet');
var http = require('axios');
var parseurl = require('parseurl');
var plugmanger = require('./src/plugins_manager');
exports.cache = {};

function applyModule(code, options) {
    var str = '';

    if (!code) {
        return JOSN.stringify(options);
    }

    for (var pro in options) {
        if (typeof options[pro] === 'object') {
            str += 'local ' + pro + "=" + JSON.stringify(options[pro]) + ';';
        } else if (typeof options[pro] === 'string') {
            if ((/\{[^\}]*\}/g).test(options[pro]) || (/\[[^\]]*\]/g).test(options[pro])) {
                str += 'local ' + pro + "=" + options[pro] + ';';
            } else {
                str += 'local ' + pro + "=\"" + options[pro] + '\";';
            }
        } else {
            str += 'local ' + pro + "=" + options[pro] + ';';
        }
    }

    return str + code;
}

exports.renderFile = function (path, options, fn) {
    options = options || {};
    fs.readFile(path, 'utf8', function (err, code) {
        if (!code) {
            return fn(null, options);
        }

        try {
            code = applyModule(code, options);
            jsonnet.transform(code, function (err, data) {
                if (err.length > 0) {
                    fn(err);
                } else {
                    fn(null, data);
                }
            });
        } catch (ex) {
            return fn(ex);
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


function createRoute(options) {
    options = options || {};
    var routeFile = options.routeFile;

    var config = require(routeFile);
    var configFolder = path.dirname(routeFile);
    var tplPath = path.resolve(__dirname, options.jsonFolder || '');
    var srcPath = path.resolve(__dirname, options.srcFolder || '');

    return function (req, res, next) {
        var pathname = parseurl(req).pathname;
        if (!config[pathname]) {
            return next();
        }

        var tpl = config[pathname]['tpl'];
        var src = config[pathname]['data'];

        if (!tpl && !src) {
            return res.send("Not config data source and data template");
        }

        if (tpl && !src) {
            return jsonnet.transformFile(path.resolve(configFolder, tpl), function (err, data) {
                if (err.length > 0) {
                    return res.send(err);
                } else {
                    return res.send(data);
                }
            });
        }
        //获取数据源配置
        var source = require(path.resolve(configFolder, src));
        var srcArray = [];
        for (var pro in source) {
            srcArray.push({ name: pro, src: source[pro] });
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