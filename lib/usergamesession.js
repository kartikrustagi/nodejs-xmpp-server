var assert = PROJECTX.assert;
var logger = PROJECTX.logger;
var db = PROJECTX.db;
var Usergamesession = null;

db.collection('usergamesession', function(err, collection){
	assert.equal(err, null);
	usergamesession = collection;
	logger.info("usergamesession collection defined and connected to");
});

var Usergamesession = function(jid){
	this.jid = jid;
};

Usergamesession.prototype.addSession = function(sessionId, cb){
	logger.info("adding sessionid "+ sessionId + " for the user " + this.jid);
	usergamesession.update({"_id":this.jid}, {"$addToSet":{"gamesessions":sessionId}},{"upsert":true}, function(error){
		cb(error);
	});
};

Usergamesession.prototype.dropSession = function(sessionId, cb){
	logger.info("removing sessionid "+ sessionId + " for the user " + this.jid);
	usergamesession.update({"_id":this.jid}, {"$pull":{"gamesessions":sessionId}}, function(error){
		cb(error);
	});
};

Usergamesession.removeSessionById = function(sessionId, cb){
	logger.info("removing sessionid "+ sessionId + " for all users");
	usergamesession.update({"gamesessions":sessionId}, {"$pull":{"gamesessions":sessionId}}, {"multi":"true"}, function(error){
		cb(error);
	});
};

exports.Usergamesession = Usergamesession;

/*
function mine(){
x = new Usergamesession('abc');
console.log(x);
//x.addSession('c', function(error){console.log(error);});
x.dropSession('a', function(error){console.log(error);});
}
setTimeout(mine, 1000);
*/
