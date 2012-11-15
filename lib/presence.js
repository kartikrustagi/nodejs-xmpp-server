var util = require('util');
var db = PROJECTX.db;
var assert = PROJECTX.assert;
var logger = PROJECTX.logger;
var presenceCollection = null;

/*
 * We store the following in DB:
 * raw jid (without resource) = {showVal : val, statusVal : val, priorityVal : val}
*/

db.collection('presence', function(err, collection) {
	assert.equal(err, null);
	presenceCollection = collection;
	logger.info("Presence collection defined and connected to");
});

var Presence = function(jid, showVal, statusVal, priorityVal){
	this.jid = jid; //bare JID (without resource)
	this.showVal = showVal;
	this.statusVal = statusVal;
	this.priorityVal = priorityVal;
};

Presence.prototype.setPresence = function(callback){
    var self = this;
	logger.info("Save request for Presence with jid(bare): "+self.jid);
	presenceCollection.update({'jid':self.jid}, {'jid':self.jid, 'showVal':self.showVal, 'statusVal':self.statusVal, 'priorityVal':self.priorityVal}, {upsert:true, safe:true}, function(err, result){
		assert.equal(err, null);
		callback(err);
	});
}

Presence.getPresence = function(jid, cb){
	assert.notEqual(jid, null);
	presenceCollection.findOne({jid:jid}, function(err, doc){
		assert.equal(err, null);
		if(doc == null){
			cb(null);
		}else{
			cb(new Presence(doc.jid, doc.showVal, doc.statusVal, doc.priorityVal));
		}
	});
}

exports.Presence = Presence;
