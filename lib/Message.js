var assert = PROJECTX.assert;
var logger = PROJECTX.logger;
var db = PROJECTX.db;
var messages = null;

db.collection('messages', function(err, collection) {
	assert.equal(err, null);
	messages = collection;
	logger.info("messages collection defined and connected to");
});

var Message = function(jid, stanza, groupJid) {
	this.stanza = stanza;
	this.jid = jid;
	this.groupJid = groupJid;
};

Message.per_jid = 1000000;

Message.key = function (jid, groupJid) {
	if (groupJid == null) {
		return ("offline:" + jid.bare().toString());
	} else {
		return ("offline:" + jid.bare().toString() + ":" + groupJid.bare().toString());
	}
};

Message.for = function(jid, groupJid, cb) {
	Message.nextFor(jid, groupJid, cb);
};

Message.nextFor = function(jid, groupJid, cb) {
	logger.info("retrieving for : "+jid);
	var key = null;
	if (groupJid) {
		//Group message
		key = Message.key(jid, groupJid);
	} else {
		//Normal message
		key = Message.key(jid);
	}

	messages.findOne({"key":key, "count":{"$gt":0}}, {"messages":{"$slice":-1}}, function(error, stanza){
		if (stanza) {
			cb(new Message(jid, stanza.messages[0]), function (isSent) {
				if (isSent) {
					messages.update({"key":key, "count":{"$gt":0}}, {"$inc":{"count":-1},"$pop":{"messages":-1}}, function(){
					Message.nextFor(jid, groupJid, cb);
					});
				} else {
					//Message not sent, do nothing
				}
			});
		}
	});
};

Message.prototype.save = function(callback) {
	var self = this;
	logger.info("Inside Save Offline Message");
	var key = null;
	if (self.groupJid) {
		//Group message
		key = Message.key(self.jid, self.groupJid);
	} else {
		//Normal message
		key = Message.key(self.jid);
	}
	messages.update({"key":key}, {"$inc":{"count":1},"$push":{"messages":this.stanza}},{"upsert":true}, function(){
		messages.update({"key":Message.key(self.jid),"count":{"$gt":Message.per_jid}},{"$inc":{"count":-1},"$pop":{"messages":-1}}, function(){
			callback(self);
		});	
	});
};

exports.Message = Message;

function isEmpty(ob){
   for(var i in ob){ if(ob.hasOwnProperty(i)){return false;}}
  return true;
}
