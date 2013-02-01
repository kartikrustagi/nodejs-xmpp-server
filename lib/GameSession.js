var assert = PROJECTX.assert;
var logger = PROJECTX.logger;
var db = PROJECTX.db;

var gameActiveSessionsCollection = null;

/*
 * We store the following in DB:
 * {sessionId:sessionId, activeUsers : valArray, gameId : val, states : valArray, activeUserCount : valArray}
*/

db.collection('gameActiveSessions', function(err, collection) {
	assert.equal(err, null);
	gameActiveSessionsCollection = collection;
	logger.info("gameActiveSessions collection defined and connected to");
});

var GameActiveSession = function(sessionId, activeUsers, gameId, states, activeUserCount){
    this.sessionId = sessionId;
    this.activeUsers = activeUsers;
    this.gameId = gameId;
    this.states = states;
    this.activeUserCount = activeUserCount;
};

GameActiveSession.getSessionBySessionId = function(sessionId, callback){
    gameActiveSessionCollection.findOne({'sessionId':sessionId}, function(err, doc){
        assert.equal(err, null);
        if(doc == null){
            callback(null);    
        }else{
            callback(new GameActiveSession(doc.sessionId, doc.activeUsers, doc.gameId, doc.states, doc.activeUserCount));
        }
    });
};

GameActiveSession.removeSessionBySessionId = function(sessionId, callback){
    gameActiveSessionCollection.remove({'sessionId':sessionId}, {single:true}, function(err, result){
        assert.equal(err, null);
		callback(result);
    });
};

GameActiveSession.prototype.getLatestState = function(callback){
	if(this.states.length > 0){
		callback(this.states[this.states.length-1]);
	}else{
		callback(null);
	}
};

GameActiveSession.prototype.addActiveUser = function(userJid, callback){
	var self = this;
	gameActiveSessionCollection.update({'sessionId':this.sessionId}, {'$push':{'activeUsers':userJid}, '$inc':{'activeUserCount':1}}, {upsert:true, safe:true}, function(err, result){
		assert.equal(err, null);
		//Add to in-memory session as well
		self.states.push(userJid);
		callback(err);
	});
};

GameActiveSession.prototype.removeActiveUser = function(userJid, callback){
	var self = this;
	gameActiveSessionCollection.update({'sessionId':this.sessionId}, {'$pull':{'activeUsers':userJid}, '$inc':{'activeUserCount':-1}}, {safe:true}, function(err, result){ 
		assert.equal(err, null);
		//Add to in-memory session as well
		self.states.splice(self.states.indexOf(userJid), 1);
		callback(err);
	});
};

GameActiveSession.prototype.saveSession = function(callback){
	gameActiveSessionsCollection.update({'sessionId':this.sessionId}, {'sessionId':this.sessionId, 'activeUsers':this.activeUsers, 'gameId':this.gameId, 'states':this.states, 'activeUserCount':this.activeUserCount, 'startTime':new Date().getTime()}, {upsert:true, safe:true}, function(err, result){
		assert.equal(err, null);
		callback(err);
	});
};

GameActiveSession.addGameState = function(opts, callback){
	logger.debug('adding game state. Input received is :');
	logger.debug(opts);
	gameActiveSessionsCollection.update({'sessionId':opts["sessionId"]}, {'$addToSet':{'states':opts["state"]}}, function(err, result){
		callback(err);
	});
};

GameActiveSession.getActivePlayers = function(sessionId, callback){
	gameActiveSessionsCollection.findOne({'sessionId':sessionId}, {'activeUsers':1}, function(err, doc){
		assert.equal(err, null);
		callback(doc.activeUsers);
	});
};

GameActiveSession.endGameSession = function(sessionId, callback){
	gameActiveSessionsCollection.remove({"sessionId":sessionId}, function(err){
		callback(err);
	});
};

exports.GameActiveSession = GameActiveSession;
