var xmpp = require('node-xmpp');
var privacy = require('../lib/privacy.js');
var Privacy = privacy.Privacy;
var ltx = require('ltx');
var logger = PROJECTX.logger;

exports.configure = function(server, config) {	
	server.on('connect', function(client) {
		client.on('retrieve_privacy', function(opts, cb){
			logger.debug("retrieving privacy for the user");
			Privacy.retrieve(opts.jid, opts.list, function(doc){
				cb(doc);	
			});
		});
		
		client.on('set-privacy', function(opts, cb){
			logger.debug("editing privacy for the user");
			Privacy.edit(opts.jid, opts.list, opts.item, function(error){
				cb(error);
			});
		});

		client.on('check-privacy', function(opts, cb){
			logger.debug("checking privacy before processing the stanza");
			Privacy.validate(opts.from, opts.to, function(error){
				cb(error);
			});
		});
	});	
};
