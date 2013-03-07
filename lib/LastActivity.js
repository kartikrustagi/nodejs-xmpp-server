var assert = PROJECTX.assert;
var logger = PROJECTX.logger;
var db = PROJECTX.db;
var lastActivity = null;

db.collection('last_activity', function(err, collection) {
	assert.equal(err, null);
	lastActivity = collection;
	logger.info("last_activity collection defined and connected to");
});

var LastActivity = function() {
};

LastActivity.setActive = function(jid) {
	lastActivity.update({jid : jid.bare().toString()}, {jid : jid.bare().toString(), activeat : 0}, {upsert : true}, function(error){
		//Lets ignore this error
	});
};

LastActivity.setInActive = function(jid) {
	var localDate = new Date();
	var sec = Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate(), localDate.getUTCHours(), localDate.getUTCMinutes(), localDate.getUTCSeconds());
	lastActivity.update({jid : jid.bare().toString()}, {jid : jid.bare().toString(), activeat : sec}, {upsert : true}, function(error){
		//Lets ignore this error
	});
};

LastActivity.getLastActiveAt = function(jid, cb) {
	lastActivity.findOne({jid : jid.bare().toString()}, function(error, doc) {
		if(error || (!doc.activeat)){
			//Ignore
			cb(null);
		} else {
			if(doc.activeat === 0) {
				cb(0);
			} else {
				var localDate = new Date();
				var sec = Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate(), localDate.getUTCHours(), localDate.getUTCMinutes(), localDate.getUTCSeconds());
				cb(sec - doc.activeat);
			}
		}
	});
};

exports.LastActivity = LastActivity;
