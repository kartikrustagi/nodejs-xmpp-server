var xmpp = require('node-xmpp');
var ltx = require('ltx');
var gameinitiator = require('../lib/GameInitiator.js');
var usergamesession = require('../lib/UserGameSession.js');
var gameinfo = require('../lib/GameInfo.js');
var gameActiveSession = require('../lib/GameSession.js');

var Gameinitiator = gameinitiator.Gameinitiator;
var Usergamesession = usergamesession.Usergamesession;
var GameInfo = gameinfo.GameInfo;
var GameActiveSession = gameActiveSession.GameActiveSession;
var logger = PROJECTX.logger;


exports.configure = function(server, config) {	
	server.on('connect', function(client) {
		client.on("game-init", function(stanza) {
			logger.debug('inside initiate game event');
			var gameData = JSON.parse(stanza.getChildText('body'));
			var jid = new xmpp.JID(stanza.attrs.from);
			GameInfo.getInfoByGameId(gameData.gameId, function(gameInfo){
				new Gameinitiator(gameData.sessionId.toString()).createSession({creatorJID:jid.bare().toString(),requestedJIDs:gameData.invites,gameInfo:gameInfo}, function(error){
					if(!error){
						new Usergamesession(jid.bare().toString()).addSession(gameData.sessionId.toString(), function(error){
							logger.info(error);
						});
						logger.debug('sending invitations to everyone');
						gameData.invites.forEach(function(jid){
							getGameMessage(gameData.sessionId.toString(), jid, 'you are requested to play this game', function(msg){
								client.emit('stanza', msg);
							});
						});
					}
				});	
			});
		});

		client.on("game-accept", function(stanza){
			logger.debug('inside accept game invitation event');
			var gameData = JSON.parse(stanza.getChildText('body'));
			var jid = new xmpp.JID(stanza.attrs.from);
			var newGame = new Gameinitiator(gameData.sessionId.toString());
			newGame.acceptInvitation(jid.bare().toString(), function(error){
				if(!error){
					new Usergamesession(jid.bare().toString()).addSession(gameData.sessionId.toString(), function(error){
						if(!error){
							Gameinitiator.ifGamePossible(gameData.sessionId, function(gamePossible){
								Gameinitiator.getGameMessageRecipients(gameData.sessionId.toString(), function(players){
									players.forEach(function(val){
										logger.debug('sending game acceptance notification to ' + val.jid);
										getGameMessage(gameData.sessionId.toString(), val.jid, 'someone accepted the invit', function(msg){
											client.emit('stanza', msg);
											if(gamePossible){
												client.emit('stanza', msg);
											}
										});
									});
								});
							});
						}
					});
				}
			});
		});

		client.on("game-start", function(stanza){
			logger.debug('inside start game event');
			var gameData = JSON.parse(stanza.getChildText('body'));
			Gameinitiator.ifGamePossible(gameData.sessionId, function(gamePossible){
				if(gamePossible){
					logger.debug('Starting Game is possible and game is being started.');
					Gameinitiator.getInfoBySessionId(gameData.sessionId, function(doc){
						var newActiveGame = new GameActiveSession(gameData.sessionId, doc.acceptedJIDs, doc.gameId,[], doc.acceptedJIDs.length)
						newActiveGame.saveSession(function(err){
							if(!err){
								Gameinitiator.getAcceptedPlayers(gameData.sessionId.toString(), function(players){
									players.forEach(function(player){
										logger.debug('sending game start notification to ' + player.jid);
										getGameMessage(gameData.sessionId.toString(), player.jid, '', function(msg){
											client.emit('stanza', msg);
										});
									});
								});
							}
						});
					});
				}
				else{
					logger.debug('not possible to start the game');
				}
			});
		});

		client.on("game-reject", function(stanza){
			logger.debug('inside reject game invitation event');
			var gameData = JSON.parse(stanza.getChildText('body'));
			var jid = new xmpp.JID(stanza.attrs.from);
			new Gameinitiator(gameData.sessionId.toString()).rejectInvitation(jid.bare().toString(), function(error){
				if(!error){
					Gameinitiator.getGameMessageRecipients(gameData.sessionId.toString(), function(players){
						players.forEach(function(player){
							logger.debug('sending game rejection notification to ' + player.jid);
							getGameMessage(gameData.sessionId.toString(), player.jid, 'someone rejected the game request', function(msg){
								client.emit('stanza', msg);
							});
						});
					});
				}
			});
		});

		client.on("game-turn", function(stanza){
			logger.debug('inside game turn event');
			var gameData = JSON.parse(stanza.getChildText('body'));
			GameActiveSession.addGameState({'sessionId':gameData.sessionId, 'state':gameData.state}, function(error){
				if(!error){
					GameActiveSession.getActivePlayers(gameData.sessionId, function(players){
						players.forEach(function(player){
							logger.debug('sending game turn to ' + player.jid);
							getGameMessage(gameData.sessionId, player.jid, gameData.state, function(msg){
								client.emit('stanza', msg);
							});
						});
					});
				}
			});
		});

		client.on("game-end", function(stanza){
			logger.debug('inside game end event');
			var gameData = JSON.parse(stanza.getChildText('body'));
			GameActiveSession.endGameSession(gameData.sessionId, function(error){
				if(!error){
					Gameinitiator.getGameMessageRecipients(gameData.sessionId.toString(), function(players){
						Gameinitiator.dropSession(gameData.sessionId, function(error){
							if(!error){
								Usergamesession.removeSessionById(gameData.sessionId, function(error){
									if(!error){
										players.forEach(function(player){
											logger.debug('sending game termination info to ' + player.jid);
											getGameMessage(gameData.sessionId, player.jid, 'game ends', function(msg){
												client.emit('stanza', msg);
											});
										});
									}
								});
							}
						});
					});
				}
			});
		});
	});
}

function getGameMessage(from, to, content, cb){
	var reply = new ltx.Element('message', {type:'chat', from:from, to:to});
	reply.c('body').t(content);
	logger.debug('message prepared to be sent is : ' + reply.toString());
	cb(reply);
};
