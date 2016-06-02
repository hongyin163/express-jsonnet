var pathRegexp = require('path-to-regexp');

function decode_param(val) {
  if (typeof val !== 'string' || val.length === 0) {
    return val;
  }

  try {
    return decodeURIComponent(val);
  } catch (err) {
    if (err instanceof URIError) {
      err.message = 'Failed to decode param \'' + val + '\'';
      err.status = err.statusCode = 400;
    }

    throw err;
  }
}
var router = {
	routeRegxCache: {},
	keysCache: {},
	match: function (config, pathname) {
		var opts = {};
		for (var p in config) {
			if (this.routeRegxCache[p]) {
				this.regexp = this.routeRegxCache[p];
				this.keys = this.keysCache[p];
			} else {
				this.regexp = pathRegexp(p, this.keys = [], opts);
				this.routeRegxCache[p] = this.regexp;
				this.keysCache[p] = this.keys;
			}

			var m = this.regexp.exec(pathname);

			if (!m) {
				this.params = undefined;
				this.path = undefined;
				continue;
			}

			// store values
			this.params = {};
			this.path = m[0];
			this.route_path = p;

			var keys = this.keys;
			var params = this.params;

			for (var i = 1; i < m.length; i++) {
				var key = keys[i - 1];
				var prop = key.name;
				var val = decode_param(m[i]);

				if (val !== undefined || !(hasOwnProperty.call(params, prop))) {
					params[prop] = val;
				}
			}
			return true;
		}
		return false;
	}
}

module.exports = router;