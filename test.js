var express = require('express');
var jsonnet=require('./index');
var path=require('path');
var app = express();

app.use(jsonnet.__jsonnet({ routeFile: path.resolve(__dirname, './config/index.json') }));

app.listen('3000', function () {
  console.log('Express server listening on port 3000');
});
