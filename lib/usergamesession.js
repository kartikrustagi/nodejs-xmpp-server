var assert = PROJECTX.assert;
var logger = PROJECTX.logger;
var db = PROJECTX.db;
var Usergamesession = null;

db.collection('usergamesession', function(err, collection){
	assert.equal(err, null);
	usergamesession = collection;
	logger.info("usergamesession collection defined and connected to");
});

var Usergamesession = function(uid){
	this.uid = uid;
};

Usergamesession.prototype.addSession = function(sessionId, cb){
	logger.info("adding sessionid "+ sessionId + " for the user " + this.uid);
	usergamesession.update({"_id":this.uid}, {"$addToSet":{"gamesessions":sessionId}},{"upsert":true}, function(error){
		cb(error);
	});
};

Usergamesession.prototype.dropSession = function(sessionId, cb){
	logger.info("removing sessionid "+ sessionId + " for the user " + this.uid);
	usergamesession.update({"_id":this.uid}, {"$pull":{"gamesessions":sessionId}}, function(error){
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
