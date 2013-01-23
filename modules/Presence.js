var xmpp = require('node-xmpp');
var ltx = require('ltx');
var logger = PROJECTX.logger;
var p = require("../lib/Presence.js");
var Presence = p.Presence;
var Privacy = require("../lib/Privacy.js");

// http://xmpp.org/extensions/xep-0160.html
// TODO (kartik) Assuming subscription to be always "both"

// TODO
// Deal with 5.1.4.  Directed Presence. 
// PROBLEM : HOW DO WE INTERRUPT A STANZA?
// IMPLEMENT PRIORITY (IN ROUTER AS WELL!)
// 

/*
 * Whether a user is offline or online is driven by the type parameter
 * Status will be a json
 * If mode = available, user is active on the app
 * If mode = away, app is closed, so need to update last seen at
 * If server sends a presence with mode = away, then it will also send last seen at as a part of status json
 */

exports.configure = function(server, config) {

	server.on('connect', function(client) {



		client.on('init-presence', function(jid) {
			Presence.initPresence(jid, function(err) {
				if(err) {
					logger.error("Unable to init presence fir jid : "+opts.jid.bare().toString());
				}
			});
		});

		client.on('stanza', function(stz) {
			var stanza = ltx.parse(stz.toString());
			if (stanza.is('presence')) {
				// Broadcast presence
				if (!stanza.attrs.to || (stanza.attrs.to === client.server.options.domain)) {
					// Customization: We are doing away with initial presence stanza limitation
					//Save presence info in DB
					logger.info("Saving presence of: "+client.jid.bare().toString());
					new Presence(client.jid.bare().toString(), stanza.attrs.type, stanza.getChildText('show'), stanza.getChildText('status'), stanza.getChildText('priority')).setPresence(function(err) {
						//TODO: What to do here?
						if(!err) {
						}
					});
					//Setting last active time
					if(stanza.attrs.type && (stanza.attrs.type === 'available')) {
						if(stanza.getChildText('status')) {
							if(stanza.getChildText('status') === 'available') {
								client.emit('set-active');
							} else if(stanza.getChildText('status') === 'away') {
								client.emit('set-inactive');
							}
						}
					} else if(stanza.attrs.type && (stanza.attrs.type === 'unavailable')) {
						client.emit('set-inactive');
					}
					if(client.roster) {
						//Sending presence probe to all roster JIDs(bare) with subscription equals both and which are connected(online)
						//Sending initial presence to all roster JIDs(bare) with subscription equals both and which are connected(online)
						//Since no S2s, so just lookup DB and send the presence info for all contacts which are online
						logger.info("Sending last stored presence of all contacts to: "+client.jid.bare().toString());
						var contact = null;
						client.roster.forEach(function(contactJidBStr) {
							contact = client.roster[contactJidBStr];
							//Checking if this contact is blocked or not either ways
							Privacy.checkPrivacy(contact.contactJid, client.jid, function(err) {
								if(err == null) {
									//We will check if the contact is online or not, if it is online then only will be send its last stored presence to client
									Presence.getPresence(contact.contactJid, function(presence) {
										if(presence.typeVal === 'unavailable') {
											//Contact offline
										} else {
											logger.info("Bingo,we have online contacts for: "+client.jid.bare().toString());
											client.send(new xmpp.Element('presence', {from: contactJidBStr,  to: client.jid.bare().toString(), type : presence.typeVal}).c('show').t(presence.showVal).up().c('status').t(presence.statusVal).up().c('priority').t(presence.priorityVal));
											//send initial presence	of the client to the contact
											stanza.attrs.to = contactJidBStr;
											client.server.cluster.publish(contactJidBStr, stanza);
										}
									});
								} else {
									logger.info("Presence: Operation not allowed due to privacy");
								}
							});
						});
					}	
				} else if(stanza.attrs.to && (stanza.attrs.to != client.server.options.domain)){
					//Directed presence, 5.1.4
					//Simplified implementation of directed presence. Just send
					//directed present to the 'to' field
					logger.info("Directed presence from: "+stanza.attrs.from+"  to: "+stanza.attrs.to);
					//Checking if this contact is blocked or not
					var toJid = new xmpp.JID(stanza.attrs.to);
					var fromJid = new xmpp.JID(stanza.attrs.from);	
					Privacy.checkPrivacy(fromJid, toJid, function(err){
						if(err == null){
							var contactJidBStr = toJid.bare().toString();
							stanza.attrs.to = contactJidBStr;
							client.server.cluster.publish(contactJidBStr, stanza);
						} 
					});
				}
			} //end of on presence
		}); //end of on stanza
		
		client.on('end', function() {
			//TODO: Check till when do we have the client object in memory
			if(!client.authenticated){
				logger.info("Presence: Returning as client is not authenticated");
				return;
			}
			var storedPresence = null;
			Presence.getPresence(contact.contactJid, function(presence) {
				if(presence) {
					//Storing unavailability in DB
					presence.type = 'unavailable';
					presence.setPresence(function(error) {
						//TODO: Now what?
					});
					// Now we need to send a <presence type="unavailable" > on his behalf
					logger.info("Sending unavailable presence since client is going away");
					var stanza = new xmpp.Element('presence', {from: client.jid.bare().toString(), type : presence.typeVal}).c('show').t(presence.showVal).up().c('status').t(presence.statusVal).up().c('priority').t(presence.priorityVal);
					client.roster.forEach(function(contactJidBStr) {
						contact = client.roster[contactJidBStr];
						//Checking if this contact is blocked or not either ways
						Privacy.checkPrivacy(contact.contactJid, client.jid, function(err) {
							if(err == null) {
								//We will check if the contact is online or not, if it is online then only will be send its last stored presence to client
								Presence.getPresence(contact.contactJid, function(presence) {
									if(presence.typeVal === 'unavailable') {
										//Contact offline
									} else {
										//send presence	of the client to the contact
										stanza.attrs.to = contactJidBStr;
										client.server.cluster.publish(contactJidBStr, stanza);
									}
								});
							} else {
								logger.info("Presence: Operation not allowed due to privacy");
							}
						});
					});
				}else {
					//Why no presence?
				}
			});
		});//end of on end



	}); //end of on server connect

} //end of configure
