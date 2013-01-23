var xmpp = require('node-xmpp');
var LastActivity = require('../lib/LastActivity').LastActivity;
var Privacy = require('../lib/Privacy').Privacy;
var NS_LAST = 'jabber:iq:last';

exports.configure = function(server, config) {

	server.on('connect', function(client) {


		client.on('set-active', function() {
			LastActive.setActive(client.jid);
		});

		client.on('set-inactive', function() {
			LastActive.setInActive(client.jid);
		});

		client.on('end', function() {
			client.emit('set-inactive');
		});

		client.on('stanza', function(stanza) {
			if(stanza.is('iq') && (stanza.attrs.type === 'get') && stanza.getChild('query', NS_LAST)) {
				if(stanza.attrs.to === client.server.options.domain) {
					//Asking for server up time
					//NOT SUPPORTED
				}else {
					//Request to get Last Activity for a JID
					var toJid = new xmpp.JID(stanza.attrs.to);
					var fromJid = new xmpp.JID(stanza.attrs.from);
					Privacy.checkPrivacy(fromJid, toJid, function(err) {
						if(err) {
							var reply = new xmpp.Element('iq', 
								{
									from : stanza.attrs.to,
									to : stanza.attrs.from,
									id : stanza.attrs.id,
									type : 'error'
								}).c('error', 
									{
										type : 'auth'
									}).c('forbidden',
										{
											xmlns : 'urn:ietf:params:xml:ns:xmpp-stanzas'
										});
							client.send(reply);
						}else {
							LastActivity.getLastActiveAt(toJid, function(result) {
								if(!result) {
									//Lets just ignore the request
								} else {
									var reply = new xmpp.Element('iq', 
										{
											from : stanza.attrs.to,
											to : stanza.attrs.from,
											id : stanza.attrs.id,
											type : 'result'
										}).c('query', 
											{
												xmlns : NS_LAST,
												seconds : result
											});
									client.send(reply);
								}
							});
						}
					});
				}
			}
		});
	

	});

}
