var xmpp = require('node-xmpp');
var privacy = require('../lib/privacy.js');
var Privacy = privacy.Privacy;
var ltx = require('ltx');

//console.log(Privacy);

exports.configure = function(server, config) {	
	server.on('connect', function(client) {
		client.on('retrieve_privacy', function(opts, cb){
			console.log("retrieving privacy for the user");
			Privacy.retrieve(opts.jid, opts.list, function(doc){
				cb(doc);	
			});
		});
		
		client.on('set-privacy', function(opts, cb){
			console.log("editing privacy for the user");
			Privacy.edit(opts.jid, opts.list, opts.item, function(error){
				cb(error);
			});
		});
	});	
}
