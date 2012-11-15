var xmpp = require('node-xmpp');
var ltx = require('ltx');
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
					//Initial Presence
					// Section 5.1.1 in http://xmpp.org/rfcs/rfc3921.html#presence
					client.initial_presence_sent = true;
					if(client.roster) {
						//Sending presence probe to all roster JIDs(bare) with subscription equals both and which are connected(online)
						//Sending initial presence to all roster JIDs(bare) with subscription equals both and which are connected(online)
						//Since no S2s, so just lookup DB and send the presence info for all contacts which are online
						client.roster.eachSubscription(["both"], function(contact) {
							// TODO (kartik) Make the calls to send non-blocking
							var clients = client.server.router.connectedClientsForJid(contact.jid); //Array of client objects for each connected resource
							if(clients.length === 0){
								//Do nothing //5.1.3(4th point)
							}else{
								//connected. Send the stored presence to client
								Presence.getPresence(contact.jid, function(clientPresence){
									client.send(new xmpp.Element('presence', {from: contact.jid,  to: stanza.attrs.from, show: clientPresence.showVal, 'status': clientPresence.statusVal, priority: clientPresence.priorityVal}));
								});
								//send initial presence	to all connected clients (all of its resources)	
								//send directly as there is no S2S
								for(resource in client.server.router.session[contact.jid]){
									stanza.attrs.to = contact.jid; //Rest of presence message remaining same
									client.server.router.session[contact.jid][resource].send(stanza);
								}
							}
						});
					}
					//Send initial presence to all of its namesakes (fellow connected resources)
					// Send the presence to the other resources for this jid, if any.
					client.server.router.connectedClientsForJid(stanza.attrs.from).forEach(function(jid){
						if(client.jid.resource != jid.resource){
							stanza.attrs.to = jid.toString();
							client.server.router.session[stanza.attrs.from][jid.resource].send(stanza);
						}
					});
					//Save presence info in DB
					new Presence(stanza.attrs.from, stanza.attrs.show, stanza.attrs['status'], stanza.attrs.priority).setPresence(function(err){
						//err already checked for null
					});
				} else if((!stanza.attrs.to || (stanza.attrs.to === client.server.options.domain)) && (!stanza.attrs.type || stanza.attrs.type === "unavailable") && client.initial_presence_sent) {
					//General presence broadcast message
					if(client.roster) {
						//Sending presence to all roster JIDs(bare) with subscription equals both and which are connected(online)
						client.roster.eachSubscription(["both"], function(contact) {
							var clients = client.server.router.connectedClientsForJid(contact.jid); //Array of client objects for each connected resource
							if(clients.length === 0){
								//Do nothing //5.1.3(4th point)
							}else{
								//connected
								stanza.attrs.to = contact.jid;
								client.send(stanza);
							}
						});
					}
					//Send initial presence to all of its namesakes (fellow connected resources)
					// Send the presence to the other resources for this jid, if any.
					client.server.router.connectedClientsForJid(stanza.attrs.from).forEach(function(jid){
						if(client.jid.resource != jid.resource){
							stanza.attrs.to = jid.toString();
							client.server.router.session[stanza.attrs.from][jid.resource].send(stanza);
						}
					});
					//Save presence info in DB
					new Presence(stanza.attrs.from, stanza.attrs.show, stanza.attrs['status'], stanza.attrs.priority).setPresence(function(err){
						//err already checked for null
					});
				} else if(stanza.attrs.to && (stanza.attrs.to != client.server.options.domain) && (!stanza.attrs.type || (stanza.attrs.type == 'unavailable'))){
					//Directed presence, 5.1.4
					//Simplified implementation of directed presence. Just send
					//directed present to the 'to' field
					for(resource in client.server.router.session[stanza.attrs.to]){
						client.server.router.session[stanza.attrs.to][resource].send(stanza);
					}
				} 
			} //end of on presence
		}); //end of on stanza
		
		client.on('disconnect', function() {
			// We need to send a <presence type="unavailable" > on his behalf
			var stanza = new xmpp.Element('presence', {from: client.jid.toString(), type: "unavailable" });
			//Namesakes (other resources)
			client.server.router.connectedClientsForJid(client.jid.toString()).forEach(function(jid) {
				if(client.jid.resource != jid.resource) {
					stanza.attrs.to = jid.toString();
					client.server.router.session[client.jid.toString()][jid.resource].send(stanza);
				}
			});
			//Online contacts in his roster
			client.roster.eachSubscription(["both"], function(contact) {
				stanza.attrs.to = contact.jid;
				var clients = client.server.router.connectedClientsForJid(contact.jid); //Array of client objects for each connected resource
				if(clients.length === 0){
					//Do nothing //5.1.3(4th point)
				}else{
					//connected
					stanza.attrs.to = contact.jid;
					client.send(stanza);
				}
			});
		});

	}); //end of on server connect
} //end of configure
