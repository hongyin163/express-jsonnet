var plugins = require('./plugins');

function plugins_manager(argument) {
	// body...
}

plugins_manager.prototype.set = function (id, func) {
	plugins[id] = func;
};

plugins_manager.prototype.get = function (id) {
	return plugins[id];
};

module.exports = new plugins_manager();