
var config = require('../jsconfig');


config.defaults(__dirname+'/config.default.js');
config.load(__dirname+'/config.js', function () {
    console.log(config);
});
