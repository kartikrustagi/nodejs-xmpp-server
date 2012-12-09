var assert = PROJECTX.assert;
var logger = PROJECTX.logger;
var db = PROJECTX.db;
var Gameinitiator = null;

db.collection('gameinitiator', function(err, collection){
	assert.equal(err, null);
	gameinitiator = collection;
	logger.info("gameinitiator collection defined and connected to");
});

var Gameinitiator = function(sessionId) {
	this.sessionId = sessionId;
};

Gameinitiator.prototype.createSession = function(opts, cb){
    logger.info("creating game session: "+ this.sessionId);
    gameinitiator.save({"_id":this.sessionId, "creator":opts["creatorJID"], "pendingJIDs":opts["requestedJIDs"], "acceptedJIDs":Array(opts["creatorJID"]), rejectedJIDs:[]}, function(error){
        cb(error);
    });
};

Gameinitiator.prototype.acceptInvitation = function(JID, cb){
	logger.info("user "+ JID + " accepting invitation");
	gameinitiator.update({"_id":this.sessionId}, {"$pull":{"pendingJIDs":JID}, "$push":{"acceptedJIDs":JID}}, function(error){
		cb(error);
	});
};

Gameinitiator.prototype.rejectInvitation = function(JID, cb){
    logger.info("user "+ JID + " rejecting invitation");
    gameinitiator.update({"_id":this.sessionId}, {"$pull":{"pendingJIDs":JID}, "$push":{"rejectedJIDs":JID}}, function(error){
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
x = new Gameinitiator('session'); 
x.createSession({"requestedJIDs":Array('r1', 'r2', 'r3'), "creatorJID":"bvjkfbvkjdfvbjkdb"}, function(error){console.log(error);});
//x = new Gameinitiator('session', 'creator');
x.rejectInvitation("r2", function(error){console.log(error);});
x.acceptInvitation("r3", function(error){console.log(error);});
x.dropSession(function(error){console.log(error);});
}
setTimeout(mine, 1000);
*/
