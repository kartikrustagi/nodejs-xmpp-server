var xmpp = require('node-xmpp');
var ltx = require('ltx');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var logger = PROJECTX.logger;
var Privacy = require('../lib/Privacy.js').Privacy;
var Presence = require('../lib/Presence.js').Presence;


/**
* C2S Router */
function Router(server) {
    this.sessions = {};
    this.server = server;
}
util.inherits(Router, EventEmitter);

/**
* Routes messages */
Router.prototype.route = function(stanza) {
    var self = this;
    stanza.attrs.xmlns = 'jabber:client';
    if (stanza.attrs && stanza.attrs.to && (stanza.attrs.to !== this.server.options.domain)) {
        var toJid = new xmpp.JID(stanza.attrs.to);
		//Checking if S2S required: Actually not required, as we don't give a shit
		logger.info("In Roster.route");
		logger.info("jid serverdomain: "+toJid.domain);
		logger.info("server domain: "+this.server.options.domain);
        if(toJid.domain === this.server.options.domain) {
			logger.debug("Recepient is same domain, as will always be the case");
			self.server.cluster.publish(toJid.bare().toString(), stanza, function(subCount) {
				if(subCount == 0) {
					//No one is subscribing to this
					logger.debug("Emitting Recepient Offline");
					self.emit("recipientOffline", stanza);
				} else {
					//Some on subscribing to it received the message, job done
				}
			});
        } else {
			logger.error("Why are we here?? No S2S");
            self.emit("externalUser", stanza);
        }
    }
    else {
        // Huh? Who is it for? and why did it end up here?
        // TODO: reply with error
    }
};

/**
 * Registers a route (jid => specific client connection)
 */
Router.prototype.registerRoute = function(jid, client) {
	logger.info("Registering route");
	// What if we have a conflict! TOFIX
    if (!this.sessions.hasOwnProperty(jid.bare().toString()))
        this.sessions[jid.bare().toString()] = client; 
    return true;
};

/**
 * Unregisters a route (jid => specific client connection)
 */
Router.prototype.unregisterRoute = function(jid) {
    if (!this.sessions.hasOwnProperty(jid.bare().toString())) {
        // Hum. What? That can't be.
    } else {
		// Only a specific jid.resource for this jid is being disconnected
        delete this.sessions[jid.bare().toString()];
    }
    return true;
};


var router = null;

// When the user is online and authenticated, let's register the route. there could be other things involed here... like presence! 
exports.setRouting = function(jid, client, server) {
	logger.debug("In set routing for jid: "+jid);
	//Register in local machine's session
	router.registerRoute(jid, client);
	//Register in the cross-machine cluster
	server.cluster.subscribeTo(jid.bare().toString(), function(channel, message){
		client.send(message);
	});
};

exports.configure = function(server, config) {

	router = new Router(server); // Using the right C2S Router.

    server.on('connect', function(client) {

        // When the user is offline, we remove him from the router.
        client.on('close', function() {
            if(client.jid) {
                // We may not have a jid just yet if the client never connected before
                router.unregisterRoute(client.jid);
				server.cluster.unsubscribeFrom(client.jid.bare().toString());
            }
        });

        // this callback is called when the client sends a stanza.
		client.on('stanza', function(stanza) {
			//Router should only care about 'message' stanzas and not iq and presence
			if(stanza.is('message')) {
				logger.info("Message stanza received from a client");
				Privacy.checkPrivacy(new xmpp.JID(stanza.attrs.from), new xmpp.JID(stanza.attrs.to), function(error) {
					if(error) {
						logger.debug("Privacy not allowing message sending, Message stanza: ");
						logger.debug(stanza);
					}else {
						//Check if for MUC
						if( (stanza.attrs.type && (stanza.attrs.type === 'groupchat')) || (stanza.attrs.to && ((new xmpp.JID(stanza.attrs.to)).domain === client.server.options.confDomain)) ) {
							//MUC subject change or message
							client.emit('groupchat-message-subject', stanza);
						} else if(stanza.getChild('x') && stanza.getChild('x').getChild('invite')) {
							client.emit('groupchat-invite', stanza, function(error, inviterJid, groupJid, inviteeJid, memberJidBStrs) {
								if (error == null) {
									logger.info('In Router module, groupchat invite successful');
									logger.info("Membership list modified");
									//Modify stanza for forwarding
									stanza.attrs.to = inviteeJid.bare().toString();
									stanza.attrs.from = groupJid.bare().toString();
									delete stanza.getChild('x').getChild('invite').attrs.to;
									stanza.getChild('x').getChild('invite').attrs.from = inviterJid.toString();
									router.route(stanza);
									//Inform members of the new participant
									client.emit('groupchat-new-member-notification', groupJid, inviteeJid, memberJidBStrs);
								} else {
									logger.error('In Router module, groupchat invite failed');
								}
							});
						} else {
							router.route(stanza);  // Let's send the stanza to the router and let the router decide what to do with it.
						}
					}
				});
			}
		});

    });
    server.router = router; // We attach the router to the server. (Maybe we want to use an event for this actually to indicate that a new router was attached to the server?)
    server.emit("c2sRoutersReady", router);
};
