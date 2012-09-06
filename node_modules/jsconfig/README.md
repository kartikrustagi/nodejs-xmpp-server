# jsconfig

loading configs from javascript files with default configs and cli support

## installation

    npm install jsconfig

## usage

jsconfig can load config file formats whatever [node.js can require](http://nodejs.org/docs/latest/api/modules.html#file_Modules):

* by default it's always possible to load `*.js` files
* if you want to use coffee-script config files, just do a require('coffee-script') before and you're able to require `*.coffee` files as well
* since node.js 0.5.x it's even possible to require `.*json` files
* if you're hardcore you can write your config in cpp and compile them to `*.node` files

```javascript
var config = require('jsconfig');
config.load('./config.js', function () {
    console.log(config);
});

// in another file
config = require('jsconfig'); // this is filled after config.load call

```


a normal config file structures looks like this:

```javascript
module.exports = {};
```

### config.load


```javascript
config.load('./db-config.js', './server-config.js'/*, […]*/);
console.log(config);
// or
config.load('./db-config.js', './server-config.js'/*, […]*/, function () {
    console.log(config);
});
```

load all config files and fills config with all settings.

 __required__

### config.defaults

```javascript
config.defaults('./db-config.default.js', './server-config.default.js'/*, […]*/);
```

load some default config files.

### config.set

```javascript
config.set('ignore unknown', true); // default is false
```

ignore all nonexisting config files and options.

does not apply on default config files.

```javascript
config.set('env', {USER: 'user.name'}); // similar to config.user.name = process.env.USER
```

define all environment variables, that should be included into config.

this overwrites config file values (default config files too).

### config.cli

```javascript
config.cli({
    user:  ['user.name', ['u', "user name", 'string']],
    debug: [false, "debug mode", 'bool'],
}); // results only in config.user.name = opts.user (after config.load call)
```

this sets up the command line interface. its basicly [node-cli](https://github.com/chriso/cli) with on little change: if cli result should be saved in config,
the cli-array should be packed into a second (outer) array as second element (the first is the position in the config object).

### config.merge

```javascript
config.merge({user:{name:'foo'}});
// or
config.merge('./hot-config.js');
```

deep copy new values into config.


