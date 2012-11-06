var util = require('util');
var db = PROJECTX.db;
var assert = PROJECTX.assert;
var logger = PROJECTX.logger;
var presenceCollection = null;

/*
 * We store the following in DB:
 * raw jid (with resource) = {show : val, status : val, priority : val}
*/

db.collection('presence', function(err, collection) {
	assert.equal(err, null);
	presenceCollection = collection;
	logger.info("Presence collection defined and connected to");
});

var Presence = function(jid, resource, showVal, statusVal, priorityVal){
	this.jid = jid;
	this.resource = resource;
	this.showVal = showVal;
	this.statusVal = statusVal;
	this.priorityVal = priorityVal;
};

Presence.prototype.setPresence = function(presence){
}

Presence.getPresence = function(jid, resource, cb){
	assert.notEqual(resource, null);
	presenceCollection.findOne({jid:jid, resource:resource}, function(err, doc){
		assert.equal(err, null);
		if(doc == null){
			cb(null);
		}else{
			cb(new Presence(doc.jid, doc.resource, doc.showVal, doc.statusVal, doc.priorityVal));
		}
	});
}
