var xmpp = require('node-xmpp');
var logger = PROJECTX.logger;

exports.configure = function(server, config) {

	server.on('connect', function(client) {

          client.on('create-room', function(stanza) {
              //On successful room creation send room creation acknowledgement
              client.send(new xmpp.Element('presence', { from : stanza.attrs.to, to : stanza.attrs.from }).c('x', { 
xmlns : 'http://jabber.org/protocol/muc#user'}).c('item', {affiliation : 'owner', role : 'moderator'}).up().c('status', {code : '110'}).up().c('status', {code : '201'}));
          });

          client.on('stanza', function(stanza) {
              //Check for MUC instruction queries
              if(stanza.is('iq') && stanza.attrs.to) {
                var toJid = new xmpp.JID(stanza.attrs.to);
                if((toJid.domain === client.server.options.confDomain) && (stanza.attrs.type && (stanza.attrs.type === 'set'))) {
                }
              }
          });

  });

};
