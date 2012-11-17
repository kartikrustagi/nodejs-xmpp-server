var xmpp = require('node-xmpp');
var ltx = require('ltx');
var logger = PROJECTX.logger;
var p = require("../lib/presence.js");
var Presence = p.Presence;

// http://xmpp.org/extensions/xep-0160.html
// TODO (kartik) Assuming subscription to be always "both"
// TODO (kartik) Assuming everything to be single server, no s2s

// TODO
// Deal with 5.1.4.  Directed Presence. 
// PROBLEM : HOW DO WE INTERRUPT A STANZA?
// IMPLEMENT PRIORITY (IN ROUTER AS WELL!)
// 

exports.configure = function(server, config) {

	server.on('connect', function(client) {
		client.initial_presence_sent = false;

		client.on('stanza', function(stz) {
			var stanza = ltx.parse(stz.toString());

			if (stanza.is('presence')) {
				// TODO: Blocking Outbound Presence Notifications.
				// Ok, now we must do things
				// Checking if this is the first presence message from a client
				if ((!stanza.attrs.to || stanza.attrs.to === client.server.options.domain) && !stanza.attrs.type && !client.initial_presence_sent) {
					logger.info("1st presence from: "+stanza.attrs.from);
					//Initial Presence
					// Section 5.1.1 in http://xmpp.org/rfcs/rfc3921.html#presence
					client.initial_presence_sent = true;
					if(client.roster) {
						//Sending presence probe to all roster JIDs(bare) with subscription equals both and which are connected(online)
						//Sending initial presence to all roster JIDs(bare) with subscription equals both and which are connected(online)
						//Since no S2s, so just lookup DB and send the presence info for all contacts which are online
						logger.info("Sending last stored presence of all contacts to: "+client.jid.bare().toString());
						client.roster.eachSubscription(["both"], function(contact) {
							// TODO (kartik) Make the calls to send non-blocking
							var clients = client.server.router.connectedClientsForJid(contact.jid); //Array of client objects for each connected resource
							logger.info("Checking online contacts for contact: "+contact.jid+" of: "+client.jid.bare().toString());
							if(clients.length === 0){
								logger.info("No online contacts for: "+client.jid.bare().toString());
								//Do nothing //5.1.3(4th point)
							}else{
								//connected. Send the stored presence to client
								logger.info("Bingo,we have online contacts for: "+client.jid.bare().toString());
								Presence.getPresence(contact.jid, function(clientPresence){
									client.send(new xmpp.Element('presence', {from: contact.jid,  to: client.jid.bare().toString(), show: clientPresence.showVal, 'status': clientPresence.statusVal, priority: clientPresence.priorityVal}));
								});
								//send initial presence	to all connected clients (all of its resources)	
								//send directly as there is no S2S
								for(resource in client.server.router.sessions[contact.jid]){
									stanza.attrs.to = contact.jid; //Rest of presence message remaining same
									client.server.router.sessions[contact.jid][resource].send(stanza);
								}
							}
						});
					}
					//Send initial presence to all of its namesakes (fellow connected resources)
					// Send the presence to the other resources for this jid, if any.
					logger.info("Sending presence to all other online resources of: "+stanza.attrs.from);
					client.server.router.connectedClientsForJid(client.jid.bare().toString()).forEach(function(jid){
						if(client.jid.resource != jid.resource){
							stanza.attrs.to = jid.toString();
							client.server.router.sessions[client.jid.bare().toString()][jid.resource].send(stanza);
						}
					});
					//Save presence info in DB
					logger.info("Saving presence of: "+client.jid.bare().toString());
					new Presence(client.jid.bare().toString(), stanza.getChildText('show'), stanza.getChildText('status'), stanza.getChildText('priority')).setPresence(function(err){
						//err already checked for null
					});
				} else if((!stanza.attrs.to || (stanza.attrs.to === client.server.options.domain)) && (!stanza.attrs.type || stanza.attrs.type === "unavailable") && client.initial_presence_sent) {
					//General presence broadcast message
					logger.info("General presence update from: "+stanza.attrs.from);
					if(client.roster) {
						//Sending presence to all roster JIDs(bare) with subscription equals both and which are connected(online)
						logger.info("Sending last stored presence of all contacts to: "+client.jid.bare().toString());
						client.roster.eachSubscription(["both"], function(contact) {
							var clients = client.server.router.connectedClientsForJid(contact.jid); //Array of client objects for each connected resource
							logger.info("Checking online contacts for contact: "+contact.jid+" of: "+client.jid.bare().toString());
							if(clients.length === 0){
								logger.info("No online contacts for: "+client.jid.bare().toString());
								//Do nothing //5.1.3(4th point)
							}else{
								//connected
								logger.info("Bingo,we have online contacts for: "+client.jid.bare().toString());
								Presence.getPresence(contact.jid, function(clientPresence){
									client.send(new xmpp.Element('presence', {from: contact.jid,  to: client.jid.bare().toString(), show: clientPresence.showVal, 'status': clientPresence.statusVal, priority: clientPresence.priorityVal}));
								});
								//send initial presence	to all connected clients (all of its resources)	
								//send directly as there is no S2S
								for(resource in client.server.router.sessions[contact.jid]){
									stanza.attrs.to = contact.jid; //Rest of presence message remaining same
									client.server.router.sessions[contact.jid][resource].send(stanza);
								}
							}
						});
					}
					//Send initial presence to all of its namesakes (fellow connected resources)
					// Send the presence to the other resources for this jid, if any.
					logger.info("Sending presence to all other online resources of: "+stanza.attrs.from);
					client.server.router.connectedClientsForJid(client.jid.bare().toString()).forEach(function(jid){
						if(client.jid.resource != jid.resource){
							stanza.attrs.to = jid.toString();
							client.server.router.sessions[client.jid.bare().toString()][jid.resource].send(stanza);
						}
					});
					//Save presence info in DB
					logger.info("Saving presence of: "+client.jid.bare().toString());
					new Presence(client.jid.bare().toString(), stanza.getChildText('show'), stanza.getChildText('status'), stanza.getChildText('priority')).setPresence(function(err){
						//err already checked for null
					});
				} else if(stanza.attrs.to && (stanza.attrs.to != client.server.options.domain) && (!stanza.attrs.type || (stanza.attrs.type == 'unavailable'))){
					//Directed presence, 5.1.4
					//Simplified implementation of directed presence. Just send
					//directed present to the 'to' field
					logger.info("Directed presence from: "+stanza.attrs.from+"  to: "+stanza.attrs.to);
					var toJID = new xmpp.JID(stanza.attrs.to);
					for(resource in client.server.router.sessions[toJID.bare().toString()]){
						client.server.router.sessions[toJID.bare().toString()][resource].send(stanza);
					}
				} 
			} //end of on presence
		}); //end of on stanza
		
		client.on('end', function() {
			// We need to send a <presence type="unavailable" > on his behalf
			logger.info("Sending unavailable presence since client is going away");
			var stanza = new xmpp.Element('presence', {from: client.jid.toString(), type: "unavailable" });
			//Namesakes (other resources)
			logger.info("Sending presence to all other online resources of: "+stanza.attrs.from);
			client.server.router.connectedClientsForJid(client.jid.toString()).forEach(function(jid) {
				if(client.jid.resource != jid.resource) {
					stanza.attrs.to = jid.toString();
					client.server.router.sessions[client.jid.toString()][jid.resource].send(stanza);
				}
			});
			//Online contacts in his roster
			logger.info("Sending presence to all other online resources of: "+stanza.attrs.from);
			client.roster.eachSubscription(["both"], function(contact) {
				stanza.attrs.to = contact.jid;
				var clients = client.server.router.connectedClientsForJid(contact.jid); //Array of client objects for each connected resource
				logger.info("Checking online contacts for contact: "+contact.jid+" of: "+client.jid.bare().toString());
				if(clients.length === 0){
					logger.info("No online contacts for: "+client.jid.bare().toString());
					//Do nothing //5.1.3(4th point)
				}else{
					//connected
					logger.info("Bingo,we have online contacts for: "+client.jid.bare().toString());
					//send initial presence	to all connected clients (all of its resources)	
					//send directly as there is no S2S
					for(resource in client.server.router.sessions[contact.jid]){
						stanza.attrs.to = contact.jid; //Rest of presence message remaining same
						client.server.router.sessions[contact.jid][resource].send(stanza);
					}
				}
			});
		});

	}); //end of on server connect
} //end of configure
