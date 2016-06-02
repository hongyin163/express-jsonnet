var plugins = require('./adapters');

function adapters_manager(argument) {
	// body...
}

adapters_manager.prototype.set = function (id, func) {
	plugins[id] = func;
};

adapters_manager.prototype.get = function (id) {
	return plugins[id];
};

module.exports = new adapters_manager();