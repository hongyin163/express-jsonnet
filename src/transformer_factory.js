var jsonnet = require('node-addon-jsonnet');
var fs = require('fs');
var vm = require('vm');

function applyJsonnetFormat(code, options) {
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
function applyJsFormat(code, options) {
    if (!code) {
        return "function main(){return "+JSON.stringify(options)+"}";
    }
    
    var regx=/function[\s]+(main)[\s]*[\(][^\)]*[\)]/g
    if(!regx.test(code)){
        throw new Error('No main function in tpl file');
    }
        
    for (var pro in options) {
        if (typeof options[pro] === 'object') {
            //str += 'local ' + pro + "=" + JSON.stringify(options[pro]) + ';';
        } else if (typeof options[pro] === 'string') {
            if ((/\{[^\}]*\}/g).test(options[pro]) || (/\[[^\]]*\]/g).test(options[pro])) {
                //str += 'local ' + pro + "=" + options[pro] + ';';
                options[pro] =JSON.parse(options[pro]);
            } else {                
                //str += 'local ' + pro + "=\"" + options[pro] + '\";';
            }
        } else {
            //str += 'local ' + pro + "=" + options[pro] + ';';
        }
    }

    return code;
}


function js_transformer(argument) {
    // body...
}

function jsonnet_transformer(argument) {
    // body...
}

function transformer(argument) {

}

transformer.prototype.create = function (extname) {
    if (extname == '.js') {
        return new js_transformer();
    } else if (extname == '.jsonnet') {
        return new jsonnet_transformer();
    } else {
        throw new Eror('not surport tpl type:' + extname);
    }
};

js_transformer.prototype.transform = function (code, data, callback) {
    // body...  
};

js_transformer.prototype.transformFile = function (filePath, data, cb) {
    fs.readFile(filePath, 'utf8', function (err, fdata) {
        if (err) {cb && cb(err);}
        
        var code = applyJsFormat(fdata, data);
        var context = new vm.createContext(data);
        var script = new vm.Script(code);
        script.runInContext(context);
        var result=data.main();
        cb&&cb(null,result);
    });
};

jsonnet_transformer.prototype.transform = function (code, data, cb) {
    if (!data) {
        return jsonnet.transform(code, cb);
    }
    var code = applyJsonnetFormat(code, data);
    jsonnet.transform(code, cb);
};

jsonnet_transformer.prototype.transformFile = function (filePath, data, cb) {
    if (!data) {
        return jsonnet.transformFile(filePath, cb);
    }
    fs.readFile(filePath, 'utf8', function (err, fdata) {
        if (err) {
            cb && cb(err)
        } else {
            var code = applyJsonnetFormat(fdata, data);
            jsonnet.transform(code, cb);
        }
    });
};

module.exports = new transformer();