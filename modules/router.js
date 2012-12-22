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
    if (stanza.attrs && stanza.attrs.to && stanza.attrs.to !== this.server.options.domain) {
        var toJid = new xmpp.JID(stanza.attrs.to);
		//TODO: Using domain_custom as library modified to work on 0.8
        if(toJid.domain_custom === this.server.options.domain) {
			logger.debug("Recepient is Internal User");
            if (self.sessions.hasOwnProperty(toJid.bare().toString())) {
				logger.debug("Recepient in Session");
                // Now loop over all the sesssions and only send to the right jid(s)
                var sent = false, resource;
                for (resource in self.sessions[toJid.bare().toString()]) {
					//if to is: kartik@localhost/mac, then to.bare().toString() => kartik@localhost and to.toString() => kartik@localhost
					//If no resource in to field then send to all and if resource is given then only to that resource
                    if (toJid.bare().toString() === toJid.toString() || toJid.resource === resource) {
                        self.sessions[toJid.bare().toString()][resource].send(stanza); 
                        sent = true;
                    }
                }
                // We couldn't find a connected jid that matches the destination. Let's send it to everyone
                if (!sent) {
                    for (resource in self.sessions[toJid.bare().toString()]) {
                        self.sessions[toJid.bare().toString()][resource].send(stanza); 
                        sent = true;
                    }                
                }
                // We couldn't actually send to anyone!
                if (!sent) {
					logger.debug("Deleting Recepient from Session");
                    delete self.sessions[toJid.bare().toString()];
					logger.debug("Emitting Recepient Offline")
                    self.emit("recipientOffline", stanza);
                }
            }
            else {
				logger.debug("Emitting Recepient Offline")
                self.emit("recipientOffline", stanza);
            }
        }
        else {
            self.emit("externalUser", stanza)
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
        this.sessions[jid.bare().toString()] = {}; 
    
	logger.info("JID resource is : "+jid.resource);
	//Multiple clients are being supported as each client is binded to a unique jid.resource
    this.sessions[jid.bare().toString()][jid.resource] = client;
    return true;
};

/**
 * Returns the list of jids connected for a specific jid.
 */
Router.prototype.connectedClientsForJid = function(jid) {
    jid = new xmpp.JID(jid);
    if (!this.sessions.hasOwnProperty(jid.bare().toString())) {
		logger.info("No connected client for jid: "+jid.bare().toString());
        return [];
    }
    else {
        var jids = [];
		logger.info("Connected client for jid: "+jid.bare().toString());
        for(var resource in this.sessions[jid.bare().toString()]) {
			logger.info(jid.bare().toString() + "/" + resource);
            jids.push(new xmpp.JID(jid.bare().toString() + "/" + resource));
        }
        return jids;
    }
};

/**
 * Unregisters a route (jid => specific client connection)
 */
Router.prototype.unregisterRoute = function(jid, client) {
    if (!this.sessions.hasOwnProperty(jid.bare().toString())) {
        // Hum. What? That can't be.
    } else {
		// Only a specific jid.resource for this jid is being disconnected
        delete this.sessions[jid.bare().toString()][jid.resource];
    }
    return true;
};


exports.configure = function(server, config) {
    var router = new Router(server); // Using the right C2S Router.
    server.on('connect', function(client) {
        // When the user is online, let's register the route. there could be other things involed here... like presence! 
        client.on('online', function() {
            router.registerRoute(client.jid, client);
        });
        
        // When the user is offline, we remove him from the router.
        client.on('end', function() {
            if(client.jid) {
                // We may not have a jid just yet if the client never connected before
                router.unregisterRoute(client.jid, client);
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
}
