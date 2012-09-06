
var config = require('../jsconfig');


config.defaults(__dirname+'/config.default.js');

config.set('env', {
    TEST: 'type',
    PORT: ['http.port', parseInt],
});

config.load(__dirname+'/config.js');

console.log(config);
