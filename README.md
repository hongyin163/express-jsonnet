# express-jsonnet
Express view engine and middlware base on jsonnet,provide json api by configuration.

used by middleware

```js
var express = require('express');
var jsonnet = require('express-jsonnet');
var app = express()

app.use(jsonnet.__jsonnet({
  routeFile:path.join(__dirname, './config/index.js')
}));

app.listen(3000)
```
or used by view engine

```js
var express = require('express');
var jsonnet = require('express-jsonnet');
var app = express()

app.engine('jsonnet', jsonnet.__express);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jsonnet');

app.listen(3000)
```

## Installation

```bash
$ npm install express-jsonnet
```

## Features

  * use jsonnet to aggregated data
  * provide json api by configuration
  * provide file,http,mongodb .etc data source

## License

  [MIT](LICENSE)