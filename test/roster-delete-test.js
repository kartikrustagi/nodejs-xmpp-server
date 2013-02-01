/*
 * Scenarios to test
 * 1. Adding contacts
 * 2. deleting contacts
 * 3. updating contacts
 * 4. deleting contact not there
 */

var sys = require('sys');
var xmpp = require('../node_modules/node-xmpp/lib/node-xmpp');
var argv = process.argv;

if (argv.length < 5) {
	console.log("incorrect arg");
	sys.puts('usage: node roster-delete-test.js <my-jid> <my-password> contact-jid');
	process.exit(1);
}

var cl = new xmpp.Client({ jid: argv[2],
	password: argv[3] });
cl.addListener('online',
				function() {
					var contactJid = argv[4];
					cl.send(new xmpp.Element('iq',
							{ from: argv[2],
								type: 'set',
								id: 'random'}).
						c('query', {xmlns: 'jabber:iq:roster'}).
						c('item', {jid : contactJid, subscription : 'remove'}));
				});
cl.addListener('stanza', function(stanza){
	console.log("In client stanza");
	console.log(stanza);
});
cl.addListener('error',
		function(e) {
			sys.puts(e);
			process.exit(1);
		});
