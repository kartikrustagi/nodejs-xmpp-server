var xmpp = require('node-xmpp');
var message = require('../lib/Message.js');
var Message = message.Message;
var ltx = require('ltx');
var logger = PROJECTX.logger;

// http://xmpp.org/extensions/xep-0160.html
function Offline() {
}

exports.configure = function(server, config) {

	server.router.on("recipientOffline", function(stanza) {
		logger.debug("Received User Offline Event");
		if(stanza.is("message")) {
			logger.debug("Identified Message");
			stanza.c("delay", {xmlns: 'urn:xmpp:delay', from: '', stamp: ISODateString(new Date())}).t("Offline Storage");
			(new Message(new xmpp.JID(stanza.attrs.to), stanza.toString())).save(function() {
				// not much
			});
		}
	});
	
	server.on('connect', function(client) {
		client.on("online", function() {
			  logger.debug("Sending Messages received while user was offline.");
			  Message.for(client.jid, function(message) {
				  client.send(ltx.parse(message.stanza));
			  });
		});
	});
	
};

function ISODateString(d) {
	function pad(n){
		return n<10 ? '0'+n : n;
	}
	return d.getUTCFullYear()+'-'
	+ pad(d.getUTCMonth()+1)+'-'
	+ pad(d.getUTCDate())+'T'
	+ pad(d.getUTCHours())+':'
	+ pad(d.getUTCMinutes())+':'
	+ pad(d.getUTCSeconds())+'Z';
}

