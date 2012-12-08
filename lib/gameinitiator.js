var assert = PROJECTX.assert;
var logger = PROJECTX.logger;
var db = PROJECTX.db;
var Gameinitiator = null;

db.collection('gameinitiator', function(err, collection){
	assert.equal(err, null);
	gameinitiator = collection;
	logger.info("gameinitiator collection defined and connected to");
});

var Gameinitiator = function(sessionId, creatorJID) {
	this.sessionId = sessionId;
	this.creatorJID = creatorJID;
};

Gameinitiator.prototype.createSession = function(requestedJIDs, cb){
    logger.info("creating game session: "+ this.sessionId);
    gameinitiator.save({"_id":this.sessionId, "creator":this.creatorJID, "pendingJIDs":requestedJIDs, "acceptedJIDs":Array(this.creatorJID), rejectedJIDs:[]}, function(error){
        cb(error);
    });
};


Gameinitiator.prototype.dropSession = function(cb){
    logger.info("deleting game session: "+ this.sessionId);
    gameinitiator.remove({"_id":this.sessionId}, function(error){
        cb(error);
    });
};

exports.Gameinitiator = Gameinitiator;

/*
function mine(){
x = new Gameinitiator('session1', 'creator'); 
x.createSession(Array('r1', 'r3'), function(error){console.log(error);});
x = new Gameinitiator('session', 'creator');
x.dropSession(function(error){console.log(error);});
}
setTimeout(mine, 1000);
*/
