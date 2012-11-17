var xmpp = require('node-xmpp');
var r = require('../lib/roster.js');
var ltx = require('ltx');
var RosterStorage = r.Roster;
var RosterContactStorage = r.RosterContact;
var logger = PROJECTX.logger;

// http://xmpp.org/rfcs/rfc3921.html#roster
/* Contacts have : 
- key(jid)
- state
- name
- groups [Not supported here for now TODO]
*/

//TODO Kartik: No authentication for any of roster related operation

exports.configure = function(server, config) {

    server.on("connect", function(client) {
        client.roster = new RosterStorage();

        client.roster.on('add', function(item) {
            // console.log("USER JUST SUBSCRIBED AND WANTS TO ADD A ROSTER ITEM");
            //
            // <iq type='set'>
            //   <query xmlns='jabber:iq:roster'>
            //     <item
            //         jid='contact@example.org'
            //         subscription='none'
            //         ask='subscribe'
            //         name='MyContact'>
            //       <group>MyBuddies</group>
            //     </item>
            //   </query>
            // </iq>
        });

        client.on('auth-success', function(jid) {
            client.roster.owner = jid.bare().toString();
        });

        client.on('stanza', function(stz) {
            var self = this;
            var stanza = ltx.parse(stz.toString());
            var query = null;
            if (stanza.is('iq') && (query = stanza.getChild('query', "jabber:iq:roster"))) {
                if(stanza.attrs.type === "get") {
					logger.info("Roster get request from : "+stanza.attrs.from);
                    stanza.attrs.type = "result";
                    RosterStorage.find(new xmpp.JID(stanza.attrs.from).bare().toString(), function(roster) {
                        roster.contacts.forEach(function(contact) {
                            query.c("item", {jid: contact.jid, name: contact.name, subscription: contact.state});
                        });
                        stanza.attrs.to = stanza.attrs.from;
                        client.send(stanza); 
                    });
                }
                else if(stanza.attrs.type === "set") {
                    stanza.attrs.type = "result";
                    var i = query.getChild('item', "jabber:iq:roster");
                    RosterStorage.find(new xmpp.JID(stanza.attrs.from).bare().toString(), function(roster) {
                        RosterContactStorage.find(roster, new xmpp.JID(i.attrs.jid).bare().toString(), function(contact) {
                            if(i.attrs.subscription === "remove") {
                                contact.delete(function() {
                                    // And now send to all sessions.
                                    i.attrs.subscription = 'remove';
                                    stanza.attrs.from = client.server.options.domain; // Remove the from field.
                                    client.server.router.connectedClientsForJid(client.jid.toString()).forEach(function(jid) {
                                        stanza.attrs.to = jid.toString();
                                        client.send(stanza); // TODO: Blocking Outbound Presence Notifications.
                                    });
                                });
                            } else {
                                if(contact.state === "from" && i.attrs.subscription === "to") {
                                    contact.state = "both";
                                }
                                else if(contact.state === "to" && i.attrs.subscription === "from") {
                                    contact.state = "both";
                                }
                                else {
                                    contact.state = i.attrs.subscription || "to";
                                }
                                contact.name = i.attrs.name || i.attrs.jid;
                                contact.save(function() {
                                    // And now send to all sessions.
                                    i.attrs.subscription = contact.state;
                                    stanza.attrs.from = client.server.options.domain; // Remove the from field.
                                    client.server.router.connectedClientsForJid(client.jid.toString()).forEach(function(jid) {
                                        stanza.attrs.to = jid.toString();
                                        client.send(stanza); // TODO: Blocking Outbound Presence Notifications.
                                    });
                                });
                            }
                        });
                    });
                } else if(stanza.attrs.type === "result") {
                    // Not much!
                }
            }
        });
    });
}
