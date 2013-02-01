var assert = PROJECTX.assert;
var logger = PROJECTX.logger;
var db = PROJECTX.db;
var privacy = null;

db.collection('privacy', function(err, collection) {
	assert.equal(err, null);
	privacy = collection;
	logger.info("privacy collection defined and connected to");
});

var Privacy = function() {
};

Privacy.retrieve = function(jid, listName, cb) {
	var jidBStr = jid.bare().toString();
	privacy.findOne({"jid" : jidBStr}, function(err, doc){
		if (doc){
			cb (doc[listName]);
		}
		else{
			privacy.save({"jid" : jidBStr, "default" : []}, function() {
				logger.debug("No privacy list for the user found. Default created");
				cb([]);
			});
		}
	});
};

Privacy.edit = function(jid, listName, item, cb) {
	logger.debug(list);
	logger.debug(item.attrs.value);
	var jidBStr = jid.bare().toString();
	privacy.findOne({"jid" : jidBStr, "default.value" : item.attrs.value}, function(err, doc){
		if(doc) {
			if(item.attrs.action == 'deny')
				cb(null);
			else {
				privacy.update({"jid" : jidBStr}, {$pull : {"default" : {"value" : item.attrs.value}}}, function(error) {
					cb(error);
				});
			}
		}
		else{
			if(item.attrs.action === 'allow')
				cb(null);
			else {
				privacy.update({"jid" : jidBStr}, {"$push" : {"default" : {"type" : "jid", "value" : item.attrs.value, "action" : item.attrs.action}}}, {"upsert" : true}, function(error){
					cb(error);
				});
			}
		}
	});	
};

Privacy.checkPrivacy = function(from, to, cb) {
	//So we will check source and destination list both
	//If either is blocking the communication, we will invalidate it
	//When A blocks B, we create entry in A's list only as we dont want B to know that A has blocked it
	//(i.e A should not be there when B 'gets' its privacy list)
	privacy.findOne({$or:[{"jid" : from.bare().toString(), "default.value" : to.bare().toString()}, {"jid" : to.bare().toString(), "default.value" : from.bare().toString()}]}, function(err, doc){
		cb(doc);
	});
};

exports.Privacy = Privacy;
