var redis = require("redis");
//redis.debug_mode = true;

var Cluster = function() {
	var self = this;
	this.channelCallbacks = {};
	this.pubClient = redis.createClient();
	this.subClient = redis.createClient();

	this.subClient.on("message", function(channel, message){
		if(!self.channelCallbacks[channel]) return;
		self.channelCallbacks[channel](channel, message);
	});
};

Cluster.prototype.subscribeTo = function(channel, callback) {
	if (this.channelCallbacks[channel]) return;
	if (typeof callback !== "function") {
		throw new Error("You must provide a callback function to subscribe");
	}
	this.channelCallbacks[channel] = callback;
	this.subClient.subscribe(channel);
};

Cluster.prototype.publish = function(channel, message, cb) {
	this.pubClient.publish(channel, message, function(arg, count){cb(count);});
};

Cluster.prototype.unsubscribeFrom = function(channel) {
	if(!this.channelCallbacks[channel]) return;
	delete this.channelCallbacks[channel];
	this.subClient.unsubscribe(channel);
};

exports.Cluster = Cluster;
