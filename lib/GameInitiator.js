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
	logger.debug('inputs for creating game session : ' + JSON.stringify(opts));
	logger.debug('creating session id : ' + this.sessionId);
    gameinitiator.save({"_id":this.sessionId, "creator":opts["creatorJID"], "createdAt":new Date().getTime(), "pendingJIDs":opts["requestedJIDs"], "acceptedJIDs":Array({"jid":opts["creatorJID"],"acceptanceTime":new Date().getTime()}), rejectedJIDs:[], "minPlayerNeeded":opts["gameInfo"].minPlayerCount, "gameId":opts["gameInfo"].gameId}, function(error){
        cb(error);
    });
};

Gameinitiator.prototype.acceptInvitation = function(JID, cb){
	logger.info("user "+ JID + " accepting invitation");
	gameinitiator.update({"_id":this.sessionId, "pendingJIDs":JID}, {"$pull":{"pendingJIDs":JID}, "$addToSet":{"acceptedJIDs":{"jid":JID,"acceptanceTime":new Date().getTime()}}}, function(error){
		cb(error);
	});
};

Gameinitiator.prototype.rejectInvitation = function(JID, cb){
    logger.info("user "+ JID + " rejecting invitation");
    gameinitiator.update({"_id":this.sessionId, "pendingJIDs":JID}, {"$pull":{"pendingJIDs":JID}, "$addToSet":{"rejectedJIDs":{"jid":JID,"rejectionTime":new Date().getTime()}}}, function(error){
		cb(error);
	});
};

Gameinitiator.getAcceptedPlayers = function(sessionId, cb){
	gameinitiator.findOne({"_id":sessionId}, {"acceptedJIDs":1}, function(err, doc){
		cb(doc.acceptedJIDs);
	});
};

Gameinitiator.getGameMessageRecipients = function(sessionId, cb){
    gameinitiator.findOne({"_id":sessionId}, {"acceptedJIDs":1, "pendingJIDs":1}, function(err, doc){
        cb(doc.acceptedJIDs.concat(doc.pendingJIDs));
    });
};

Gameinitiator.dropSession = function(sessionId, cb){
    logger.info("deleting game session: "+ sessionId);
    gameinitiator.remove({"_id":sessionId}, function(error){
        cb(error);
    });
};

Gameinitiator.ifGamePossible = function(sessionId, cb){
	gameinitiator.findOne({"_id":sessionId}, {"acceptedJIDs":1, minPlayerNeeded:1}, function(err, doc){
        assert.equal(err, null);
		if(doc.acceptedJIDs.length >= doc.minPlayerNeeded){
			cb(true);
		}
		else{
			cb(false);
		}
    });
};

Gameinitiator.getInfoBySessionId = function(sessionId, cb){
	gameinitiator.findOne({"_id":sessionId}, function(err, doc){
		assert.equal(err, null);
		cb(doc);
	});
};

exports.Gameinitiator = Gameinitiator;

/*
function mine(){
x = new Gameinitiator('session'); 
x.createSession({"requestedJIDs":Array('r1', 'r2', 'r3'), "creatorJID":"bvjkfbvkjdfvbjkdb"}, function(error){});
//x = new Gameinitiator('session', 'creator');
x.rejectInvitation("r2", function(error){});
x.acceptInvitation("r3", function(error){});
x.dropSession(function(error){});
}
setTimeout(mine, 1000);
*/
