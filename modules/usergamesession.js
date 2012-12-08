//this is a copy of some other module... need to respond to respond to mutually agreed upon events accordingly

var xmpp = require('node-xmpp');
var message = require('../lib/usergamesession.js');
var Message = message.Message;
var ltx = require('ltx');


exports.configure = function(server, config) {
	server.router.on("recipientOffline", function(stanza) {
		console.log("Received User Offline Event");
		if(stanza.is("message")) {
			console.log("Identified Message");
			stanza.c("delay", {xmlns: 'urn:xmpp:delay', from: '', stamp: ISODateString(new Date())}).t("Offline Storage");
			(new Message(new xmpp.JID(stanza.attrs.to).bare().toString(), stanza.toString())).save(function() {
				// not much
			});
		}
	});
	
	server.on('connect', function(client) {
		client.on("online", function() {
			  console.log("Sending Messages received while user was offline.");
			  Message.for(client.jid.bare().toString(), function(message) {
				  client.send(ltx.parse(message.stanza));
			  });
		});
	});	
}
