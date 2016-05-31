function getProperty() {
	return "test";
}

function main() {
	var target = { "test": getProperty() };
	[s1, s2, s3].reduce(function (pre, current) {
		return Object.assign(pre, current);
	}, target);
	return target;
}
