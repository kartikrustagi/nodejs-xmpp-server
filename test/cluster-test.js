var Cluster = require('../lib/cluster.js');
var c = new Cluster.Cluster();

setTimeout(function() { 
	console.log("Publishing");
	c.publish('kartik', 'hello world');
}, 3000);

setTimeout(function() { 
	c.unsubscribeFrom('kartik');
	c.publish('kartik', 'hello world 2');
	c.publish('rustagi', 'hello world 2');
}, 4000);


c.subscribeTo("kartik", function(channel, message) {
	console.log(channel);
	console.log(message);
});

c.subscribeTo("rustagi", function(channel, message) {
	console.log(channel);
	console.log(message);
});
