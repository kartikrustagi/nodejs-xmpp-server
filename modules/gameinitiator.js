//copy of some other module.. need to rewrite the events
var xmpp = require('node-xmpp');
var ltx = require('ltx');
var gameinitiator = require('../lib/gameinitiator.js');
var usergamesession = require('../lib/usergamesession.js');

var Gameinitiator = gameinitiator.Gameinitiator;
var Usergamesession = usergamesession.Usergamesession;
var logger = PROJECTX.logger;

function Offline() {
}

exports.configure = function(server, config) {	
	server.on('connect', function(client) {
		client.on("game-init", function(stanza) {
			//logger.info(stanza);
			var gameData = JSON.parse(stanza.getChildText('body'));
			var jid = new xmpp.JID(stanza.attrs.from);
			new Gameinitiator(gameData.sessionId.toString()).createSession({creatorJID:jid.bare().toString(),requestedJIDs:gameData.invits}, function(error){
				if(!error){
					new Usergamesession(jid.bare().toString()).addSession(gameData.sessionId.toString(), function(error){
                        console.log(error);
                    });
					var modifiedStanza = stanza;
					modifiedStanza.attrs.from = stanza.attrs.to;
					gameData.invits.forEach(function(jid){
						modifiedStanza.attrs.to = jid;
						client.emit('stanza', modifiedStanza);	
					});
				}
			});
		});

		client.on("game-accept", function(stanza){
			//logger.info(stanza);
			var gameData = JSON.parse(stanza.getChildText('body'));
			var jid = new xmpp.JID(stanza.attrs.from);
			new Gameinitiator(gameData.sessionId.toString()).acceptInvitation(jid.bare().toString(), function(error){
				if(!error){
					new Usergamesession(jid.bare().toString()).addSession(gameData.sessionId.toString(), function(error){
						if(!error){
							activeMemberCount = Gameinitiator.getAcceptedPlayers(gameData.sessionId.toString(), function(result){
								if (result.length >= 2){
									var modifiedStanza = stanza;
									modifiedStanza.attrs.from = stanza.attrs.to;
									result.forEach(function(val){
                    					modifiedStanza.attrs.to = val.jid;
										console.log(modifiedStanza);
										client.emit('stanza', modifiedStanza);
									});	
								}
							});
						}
					});
				}
			});
		});

		client.on("game-reject", function(stanza){
			//logger.info(stanza);
			var gameData = JSON.parse(stanza.getChildText('body'));
			var jid = new xmpp.JID(stanza.attrs.from);
			new Gameinitiator(gameData.sessionId.toString()).rejectInvitation(jid.bare().toString(), function(error){
				console.log(error);
			});
		});

		client.on("drop-game-session", function(){
		
		});
	});
}
