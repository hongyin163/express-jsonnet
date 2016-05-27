var fs = require('fs');
var path = require('path');
var Jsonnet = require('./lib/jsonnet');
var parseurl = require('parseurl');

var jsonnet = new Jsonnet();

exports.cache = {};

function applyModule(code, options) {
    var str = '';

    if (!code) {
        return JOSN.stringify(options);
    }

    for (var pro in options) {
        if (typeof options[pro] === 'object') {
            str += 'local ' + pro + "=" + JSON.stringify(options[pro]) + ';';
        }
        else {
            str += 'local ' + pro + "=\"" + options[pro] + '\";';
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
            code = jsonnet.transform(code);
        } catch (ex) {
            return fn(ex);
        }
        return fn(null, code);
    });
};


function getDataFormSource(src, callback) {
    if (typeof src == 'object') {
        callback(src);
    } else if (src.indexOf('http') == 0) {
        callback(JSON.parse(src));
    }
    else if (src.indexOf('{' == 0)) {
        callback(JSON.parse(src));
    }
}

var results = {};
function handler(source, callback) {
    if (source.length > 0) {
        var last = source.pop();
        getDataFormSource(last.src, function (data) {
            results[last.name] = data;
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
            next();
        }


        var tpl = config[pathname]['tpl'];
        var src = config[pathname]['data'];
        //获取数据源配置
        var source = require(path.resolve(configFolder, src));

        var srcArray = [];
        for (var pro in source) {
            srcArray.push({ name: pro, src: source[pro] });
        }

        results = {}
        try {
            handler(srcArray, function (data) {
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