
var config = require('../jsconfig');


config.defaults(__dirname+'/config.default.js');

config.set('env', {
    TEST: 'type',
    PORT: ['http.port', parseInt],
});

config.set('ignore unknown', true);

config.set('opts', {
    test: 'type',
});

config.cli({
    port: ['http.port', ['p', "give me a port!", 'int']],
    test: [false, "change the config type!", 'string'],
});

config.load(__dirname+'/config.js', function (args, opts) {
    console.log(args, opts, config);
});
