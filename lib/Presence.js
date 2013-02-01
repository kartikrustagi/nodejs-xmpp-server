var util = require('util');
var db = PROJECTX.db;
var assert = PROJECTX.assert;
var logger = PROJECTX.logger;
var presenceCollection = null;
var xmpp = require('node-xmpp');


/*
 * We store the following in DB:
 * raw jid (without resource) = {typeVal : val, showVal : val, statusVal : val, priorityVal : val}
*/

db.collection('presence', function(err, collection) {
	assert.equal(err, null);
	presenceCollection = collection;
	logger.info("Presence collection defined and connected to");
});

var Presence = function(jid, typeVal, showVal, statusVal, priorityVal){
	this.jid = jid;
	this.typeVal = typeVal;
	this.showVal = showVal;
	this.statusVal = statusVal;
	this.priorityVal = priorityVal;
};

Presence.prototype.setPresence = function(callback) {
    var self = this;
	var jidBStr = self.jid.bare().toString();
	logger.info("Save request for Presence with jid(bare): "+jidBStr);
	presenceCollection.update({'jid' : jidBStr}, {'jid' : jidBStr, 'typeVal' : self.typeVal, 'showVal' : self.showVal, 'statusVal': self.statusVal, 'priorityVal' : self.priorityVal}, {upsert : true, safe : true}, function(err, result) {
		callback(err);
	});
};

Presence.getPresence = function(jid, cb){
	var jidBStr = jid.bare().toString();
	logger.debug("In Presence(lib), getPresence: "+jidBStr);
	presenceCollection.findOne({jid : jidBStr}, function(err, doc) {
		if ((err != null) || (doc == null)) {
			cb(null);
		} else {
			cb(new Presence(new xmpp.JID(doc.jid), doc.typeVal, doc.showVal, doc.statusVal, doc.priorityVal));
		}
	});
};

Presence.initPresence = function(jid, callback) {
	var p = new Presence(jid, 'unavailable', 'Yikees!', 'available', '');
	p.setPresence(callback);
};

exports.Presence = Presence;
