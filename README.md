# webpack-dynamic-hash

Webpack plugin that allows to configure dynamic hash

- Compatible with webpack 4, 3, 2
- Lightweight
- No dependencies
- Tested
- Production-ready

# Why is it helpful?

Webpack allows to atomatically split code to chunks and add hash to file name.

For example

```
    chunkFilename: 'chunk-[name]-[hash].js',
```

will result in `chunk-name-xxxx.js`

but sometimes I need the hash to be a variable, for example:

`chunk-name-[GLOBAL.version].js`

`Global.version` is a variable and only to be invoked at runtime, when it changes, the browser will load a different chunk.

# How to use

```javascript
// webpack.config.js
const WebpackDynamicHash = require("webpack-dynamic-hash");
const WebpackDynamicHashConfig = {
  // see configuration options below
};
module.exports = {
  output: {
    filename: "[name].js",
    chunkFilename: "[name]-[hash].js"
  },
  plugins: [new WebpackDynamicHash(WebpackDynamicHashConfig)]
};
```

# Configuration

If no options provided, the default `config.output.publicPath` will be used.


## `methodName`

Name of the globaly defined method that will be invoked at runtime, the method should return a string that will be used for dynamically importing of chunks.

For example, if chunk name is `0.js` and options object is `{methodName: "getVersion" }`, while `window.getVersion` is defined to be:

```javascript
window.getVersion = function() {
  if (true) {
    // use any condition to choose the URL
    return "0.0.0";
  }
};
```

the chunk will be fetched from `https://app.cdn.com/0-0.0.0.js`

## `variableName`

Just like `methodName`, `variableName` is the globaly defined variable that will be invoked at runtime, the variableName is a string that will be used to replace the hash placeholder for dynamically importing of chunks.

For example, if default URL is `https://localhost`, chunk name is `0.js` and options object is `{variableName: "GLOBAL.version" }`, while `window.GLOBAL.version` is defined to be:

```javascript
window.GLOBAL.version = "0.0.0";
```

the chunk will be fetched from `https://app.cdn.com/0-0.0.0.js`

## Defining gobaly available methods and variable

When your JS code is executed in browser, the variable/methods whose names you mention as `variableName`, `methodName` should be set **before** the first call to `require.ensure()` or `import()` is executed.

The return value of the methods will be used to build the URL for fetching resources.

For example, let's define `veryFirst` method to be globally available before you main bundle is being executed.

Add the method definition at the very first line of you bundle:

```javascript
const window.veryFirst = function () {
 console.log("I am very first!");
}
```

You can use a separate file and use `webpack`'s [entry point list](https://webpack.js.org/configuration/entry-context/#entry):

```javascript
// filename: veryFirst.js
const window.veryFirst = function () {
 console.log("I am very first!");
}

// file webpack.config.js
module.exports = {
  entry: {
    ['./veryFirst.js', './index.js']
  }
}
```

Another approach is to define `veryFirst` as part of `index.html` when building it on your server:

```javascript
// filename: server/app.js
app.get("/", (req, res) =>
  res.render("views/index", {
    cdnPath: "https://qa.cdn.com/|https://prod.cdn.com/"
  })
);
```

```HTML
<!-- filename: views/index.ejs -->
<html>
<script>
  const baseCDN = "<%= cdnPath %>";
  window.veryFirst = function () {
      console.log(`${baseCDN}/js/`);
  }
</script>
...
</html>
```

# Troubleshooting


Don't hesitate to open issues.

# Tests

`yarn test`
