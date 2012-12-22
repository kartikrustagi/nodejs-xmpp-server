var assert = PROJECTX.assert;
var logger = PROJECTX.logger;
var db = PROJECTX.db;
var messages = null;

db.collection('messages', function(err, collection) {
	assert.equal(err, null);
	messages = collection;
	logger.info("messages collection defined and connected to");
});

var Message = function(jid, stanza) {
	this.stanza = stanza;
	this.jid = jid;
};

Message.per_jid = 2;

Message.key = function(jid) {
	return "offline:" + jid.toString();
};

Message.for = function(jid, cb) {
	Message.nextFor(jid, cb);
};

Message.nextFor = function(jid, cb) {
	logger.debug("retrievng for : "+jid);
	messages.findOne({"jid":Message.key(jid), "count":{"$gt":0}}, {"messages":{"$slice":-1}}, function(error, stanza){
		if(stanza){
			cb(new Message(jid, stanza.messages[0]));
			messages.update({"jid":Message.key(jid), "count":{"$gt":0}}, {"$inc":{"count":-1},"$pop":{"messages":-1}}, function(){
				Message.nextFor(jid, cb);
			});
		}
	});
};

Message.lpush = function(offlineJid, stanza) {
	logger.debug("Offline-JID"+offlineJid)
	logger.debug("Stanza"+stanza)
	messages.update({"jid":offlineJid}, {"$inc":{"count":1},"$push":{"messages":stanza}},{"upsert":true})
}

Message.prototype.save = function(callback) {
	var self = this;
	logger.debug("Inside Save Offline Message");
	messages.update({"jid":Message.key(self.jid)}, {"$inc":{"count":1},"$push":{"messages":this.stanza}},{"upsert":true}, function(){
		messages.update({"jid":Message.key(self.jid),"count":{"$gt":Message.per_jid}},{"$inc":{"count":-1},"$pop":{"messages":-1}}, function(){
			callback(self);
		});	
	});
};

exports.Message = Message;

function isEmpty(ob){
   for(var i in ob){ if(ob.hasOwnProperty(i)){return false;}}
  return true;
}
