var xmpp = require('node-xmpp');
var ltx = require('ltx');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var logger = PROJECTX.logger;


/**
* C2S Router */
function Router(server) {
    this.sessions = {};
    this.server = server;
}
util.inherits(Router, EventEmitter);

/**
* Routes messages */
Router.prototype.route = function(stanza, from) {
    var self = this;
    stanza.attrs.xmlns = 'jabber:client';
    if (stanza.attrs && stanza.attrs.to && (stanza.attrs.to !== this.server.options.domain)) {
        var toJid = new xmpp.JID(stanza.attrs.to);
		//Checking if S2S required: Actually not required, as we don't give a shit
        if(toJid.domain_custom === this.server.options.domain) {
			logger.debug("Recepient is same domain, as will always be the case");
            if (self.sessions.hasOwnProperty(toJid.bare().toString())) {
				logger.debug("Recepient in Session");
                // Now loop over all the sesssions and only send to the right jid(s)
				self.sessions[toJid.bare().toString()].send(stanza);
            }
            else {
				//TODO: Maybe on some other cluster
				logger.debug("Emitting Recepient Offline");
                self.emit("recipientOffline", stanza);
            }
        }
        else {
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

exports.configure = function(server, config) {
    var router = new Router(server); // Using the right C2S Router.
    server.on('connect', function(client) {

        // When the user is online and authenticated, let's register the route. there could be other things involed here... like presence! 
        client.on('auth-success', function() {
			//Register in local machine's session
            router.registerRoute(client.jid, client);
			//Register in the cross-machine cluster

        });
        
        // When the user is offline, we remove him from the router.
        client.on('end', function() {
            if(client.jid) {
                // We may not have a jid just yet if the client never connected before
                router.unregisterRoute(client.jid);
            }
        });

        // this callback is called when the client sends a stanza.
        client.on('stanza', function(stanza) {
			//Router should only care about 'message' stanzas and not iq and presence
			if(stanza.is('message')){
				logger.info("Message stanza received from a client");
				router.route(stanza, client);  // Let's send the stanza to the router and let the router decide what to do with it.
			}
        });

    });
    server.router = router; // We attach the router to the server. (Maybe we want to use an event for this actually to indicate that a new router was attached to the server?)
    server.emit("c2sRoutersReady", router);
};
