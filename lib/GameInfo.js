var assert = PROJECTX.assert;
var logger = PROJECTX.logger;
var db = PROJECTX.db;

var gameInfoCollection = null;

/*
 * We store the following in DB:
 * {gameId : gameId, name : val, minPlayerCount : val}
*/

db.collection('gameInfo', function(err, collection) {
	assert.equal(err, null);
	gameInfoCollection = collection;
	logger.info("gameInfo collection defined and connected to");
});

var GameInfo = function(gameId, name, minPlayerCount){
    this.gameId = gameId;
    this.name = name;
    this.minPlayerCount = minPlayerCount;
};

GameInfo.prototype.saveInfo = function(callback){
	gameInfoCollection.update({'gameId':this.gameId}, {'gameId':this.gameId, 'name':this.name, 'minPlayerCount':this.minPlayerCount}, {upsert:true, safe:true}, function(err, result){
		assert.equal(err, null);
		callback(err);
	});
};

GameInfo.getInfoByGameId = function(gameId, callback){
	gameInfoCollection.findOne({'gameId':gameId}, function(err, doc){
		assert.equal(err, null);
		if(doc == null){
			callback(null);    
		}else{
			callback(new GameInfo(doc.gameId, doc.name, doc.minPlayerCount));
		}
	});
};

exports.GameInfo = GameInfo;

/*
function mine(){
GameInfo.getInfoByGameId('1', function(res){})
}
setTimeout(mine, 1000);
*/
