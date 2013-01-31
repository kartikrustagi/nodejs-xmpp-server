var xmpp = require('node-xmpp');
var r = require('../lib/Roster.js');
var ltx = require('ltx');
var Roster = r.Roster;
var Contact = r.Contact;
var logger = PROJECTX.logger;

// http://xmpp.org/rfcs/rfc3921.html#roster
/* Contacts have : 
- key(jid)
- state
- name
- groups [Not supported here for now TODO]
*/

//TODO Kartik: No authentication for any of roster related operation

exports.setRoster = function(jid, client, authCb) {
	Roster.find(jid, function(roster) {
		client.roster = roster;
		console.log("In Roster set roster: ");
		console.log(client.roster);
		authCb();
	});
};

exports.configure = function(server, config) {

    server.on("connect", function(client) {

        client.on('stanza', function(stz) {
            var self = this;
            var stanza = ltx.parse(stz.toString());
            var query = null;
            if (stanza.is('iq') && (query = stanza.getChild('query', "jabber:iq:roster"))) {
				console.log("In stanza roster: ");
				console.log(client.roster);
                if(stanza.attrs.type === "get") {
					logger.info("Roster get request from : "+stanza.attrs.from);
                    stanza.attrs.type = "result";
					var contactJidBStr = null;
					for(contactJidBStr in client.roster.contacts) {
						if(client.roster.contacts.hasOwnProperty(contactJidBStr)) {
							var contact = client.roster.contacts[contactJidBStr];
							query.c("item", {jid: contact.contactJid, name: contact.name, subscription: contact.subscription});
						}
					}
					stanza.attrs.to = stanza.attrs.from;
					client.send(stanza); 
                } else if(stanza.attrs.type === "set") {
                    stanza.attrs.type = "result";
                    var i = query.getChild('item', "jabber:iq:roster");
					if(i.attrs.subscription === "remove") {
						client.roster.deleteContact(new xmpp.JID(i.attrs.jid), function(err) {
							var resultStanza = null;
							if(err == null) {
								resultStanza = new xmpp.Element('iq', {'to' : stanza.attrs.from, 'type' : 'result', 'id' : stanza.attrs.id});
							}else {
								resultStanza = new xmpp.Element('iq', {'to' : stanza.attrs.from, 'type' : 'error', 'id' : stanza.attrs.id});
								resultStanza.c("error").c('text', { xmlns: "urn:ietf:params:xml:ns:xmpp-stanzas" }).t(err.message);
							}
							console.log("Post deleteContact roster");
							console.log(client.roster);
							client.send(resultStanza);
						});
					} else {
						// update or add contact request
						client.roster.addContact(new xmpp.JID(i.attrs.jid), i.attrs.name, function(err) {
							var resultStanza = null;
							if(err == null) {
								resultStanza = new xmpp.Element('iq', {'to' : stanza.attrs.from, 'type' : 'result', 'id' : stanza.attrs.id});
							}else {
								resultStanza = new xmpp.Element('iq', {'to' : stanza.attrs.from, 'type' : 'error', 'id' : stanza.attrs.id});
								resultStanza.c("error").c('text', { xmlns: "urn:ietf:params:xml:ns:xmpp-stanzas" }).t(err.message);
							}
							console.log("Post addContact Roster");
							console.log(client.roster);
							client.send(resultStanza);
						});
						
					}
				}
			}
        });

    });
}
