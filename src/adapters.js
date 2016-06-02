var http = require('http');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
module.exports = {
	http: function (url, opts, cb) {
		http.get(url, (res) => {
			var size = 0;
			var chunks = [];
			res.on('data', function (chunk) {
				size += chunk.length;
				chunks.push(chunk);
			});
			res.on('end', function () {
				var data = Buffer.concat(chunks, size);
				cb && cb(null, data.toString());
			});
		}).on('error', (e) => {
			cb && cb(e.message);
		});
	},
	file: function (p, opts, cb) {
		var filepath = p.substring(p.indexOf('://') + 3);	
		
		fs.readFile(filepath, function (err, data) {
			cb(err, data + "");
		});
	}
}