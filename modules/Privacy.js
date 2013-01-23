var xmpp = require('node-xmpp');
var privacy = require('../lib/Privacy.js');
var Privacy = privacy.Privacy;
var ltx = require('ltx');
var logger = PROJECTX.logger;
var NS_PRIVACY = 'jabber:iq:privacy';

exports.configure = function(server, config) {	

	server.on('connect', function(client) {


		client.on('stanza', function(stanza) {
			var fromJId = new xmpp.JID(stanza.attrs.from);
			if (stanza.is('iq') && stanza.getChild('query', NS_PRIVACY)) {
				var privacy = stanza.getChild('query', NS_PRIVACY);
				var reply = new ltx.Element('iq',{type: 'result'});
				if (stanza.attrs.id)
						reply.attrs.id = stanza.attrs.id;	
				if (stanza.attrs.from)
						reply.attrs.to = stanza.attrs.from;
				if (stanza.attrs.type === 'get') {
					reply.c('query', { xmlns: NS_PRIVACY });
					if (privacy.getChild('list')) {
						Privacy.retrieve(fromJid, 'default', function(privacy_list) {
							reply.getChild('query').c("list", {name : "default"});
							for(var i=0; i<privacy_list.length; i++) {
								reply.getChild('query').getChild('list').c('item', {"type" : privacy_list[i].type, "value" : privacy_list[i].value, "action" : privacy_list[i].action});
							}
						});
					} else {
						reply.c('query', { xmlns: NS_PRIVACY }).
							c("active name ='default'").up().
							c("default name='default'").up().
							c("list name ='default'");
					}
					client.send(reply);
				} else if (stanza.attrs.type === 'set') {
					Privacy.edit(fromJid, 'default' , privacy.getChild('list').getChild('item'),  function(error) {
						if (!error){
							client.send(reply);
						}
					});
				}
			} else {
				//Not related to privacy
			}
		});


	});	

};
