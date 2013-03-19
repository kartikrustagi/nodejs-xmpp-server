var xmpp = require('node-xmpp');
var logger = PROJECTX.logger;

// Loading all modules needed
var Router      = require('./Router');
var Roster		= require('./Roster');
var Presence    = require('./Presence');
var LastActivity = require('./LastActivity');
var Offline		= require('./Offline');
var Privacy		= require('./Privacy');
var GameInitiator	= require('./GameInitiator');
var MUC = require('./MUC');
var User = require('../lib/Users').User;
var Cluster = require('../lib/Cluster').Cluster;

exports.run = function(config, ready) {
    
    // Creates the server.
    var server = new xmpp.C2SServer(config);
	server.cluster = new Cluster();

	// Configure the mods at the server level!
	Roster.configure(server, config.roster);
    Router.configure(server, config.router); 
	Presence.configure(server, config.presence);
	LastActivity.configure(server, config.lastActivity);
	Offline.configure(server, config.offline);
	Privacy.configure(server, config.privacy);
	MUC.configure(server, config.muc);
	/*
	GameInitiator.configure(server, config.gamedata);
	*/

    // On Connect event. When a client connects.
    server.on("connect", function(client) {

        // Allows the developer to authenticate users against anything they want.
        client.on("authenticate", function(opts, cb) {
            User.find(opts.jid, function(user) {
				if (user && user.attrs.password === opts.password) {
					Router.setRouting(opts.jid, client, server);
					Roster.setRoster(opts.jid, client, cb);
				} else
                    cb(new Error("Authentication failure"));
            });
		});

		// Allows the developer to register the jid against anything they want
        client.on("register", function(opts, cb) {
            User.register(opts.jid, opts.password, {
                success: function() {
					//Tasks required to be done before callback
					//1. Init Presence
					client.emit('init-presence', opts.jid, cb);
                },
                error: function(message) {
					logger.info("Server: "+opts.jid.bare().toString()+" already registered");
                    var err = new Error(message);
                    err.code = 409;
                    err.type = "cancel";
                    cb(err);
                }
            });
		});


    });
	
    // This is a callback to trigger when the server is ready. That's very useful when running a server in some other code.
    // We may want to make sure this is the right place for it in the future as C2S and S2S may not be abll ready.
    ready();
}
