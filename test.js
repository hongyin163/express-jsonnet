var express = require('express');
var jsonnet = require('./index');
var path = require('path');
var app = express();

app.use(jsonnet.__jsonnet({
  enableCache: true,
  //default in memory cache
  //use this interface to overide default cache implemention
  // cache:{
  //   get:function(key,callback){callback(result);},
  //   set:function(key,value){}
  // },
  dataFolder: path.resolve(__dirname, './config/data/'),//used in /data/index.js file config args {dataFolder}
  routeFile: path.resolve(__dirname, './config/index.json')
}));

app.get('/json/:id/:name', function (req, res) {
  res.send({ gender: 'man', id: req.params.id, name: req.params.name });
});

app.listen('3000', function () {
  console.log('Express server listening on port 3000');
});
