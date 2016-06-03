
function main() {
	var target={};
	[s1, s2, s3].reduce(function (pre, current) {
		return Object.assign(pre, current);
	}, target);
	return target;
}
