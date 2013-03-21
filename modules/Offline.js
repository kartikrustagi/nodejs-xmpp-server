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
		logger.info("Received User Offline Event");
		if(stanza.is("message")) {
			logger.info("Identified Message");
			stanza.c("delay", {xmlns: 'urn:xmpp:delay', from: '', stamp: ISODateString(new Date())}).t("Offline Storage");
			(new Message(new xmpp.JID(stanza.attrs.to), stanza.toString(), null)).save(function() {
				// not much
			});
		}
	});

	server.router.on("recipientOfflineGroupchat", function(stanza, groupJid) {
		logger.info("Groupchat message stanza received when user is offline");
		if(stanza.is("message")) {
			logger.info("Identified Message");
			stanza.c("delay", {xmlns: 'urn:xmpp:delay', from: '', stamp: ISODateString(new Date())}).t("Offline Storage");
			(new Message(new xmpp.JID(stanza.attrs.to), stanza.toString(), groupJid)).save(function() {
				// not much
			});
		}
	});

	
	server.on('connect', function(client) {
		client.on("online", function() {
			  logger.info("Sending Messages received while user was offline.");
			  Message.for(client.jid, null, function(message, cb) {
				  client.server.cluster.publish(client.jid.bare().toString(), ltx.parse(message.stanza), function(subCount) {
					  if (subCount == 0) {
						  logger.info("User is again offline while sending offline messages");
						  cb(false);
					  } else {
						  logger.info("Offline message sent to user successfuly");
						  cb(true);
					  }
				  });
			  });
		});

		client.on("groupchat-offline-messages", function(groupJid) {
			  logger.info("Sending Groupchat Messages for the group:" + groupJid.bare().toString() + " received while user:" + client.jid.bare().toString() + " was offline.");
			  Message.for(client.jid, groupJid, function(message, cb) {
				  client.server.cluster.publish(client.jid.bare().toString(), ltx.parse(message.stanza), function(subCount) {
					  if (subCount == 0) {
						  logger.info("User is again offline while sending offline group messages");
						  cb(false);
					  } else {
						  logger.info("Offline group message sent to user successfuly");
						  cb(true);
					  }
				  });
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
