/*
 * Scenarios to test
 * 1. Adding contacts
 * 2. deleting contacts
 * 3. updating contacts
 * 4. deleting contact not there
 * 5. Adding contacts which are not active users
 */

var sys = require('sys');
var xmpp = require('../node_modules/node-xmpp/lib/node-xmpp');
var argv = process.argv;

if (argv.length < 4) {
	console.log("incorrect arg");
	sys.puts('usage: node auth.js <my-jid> <my-password>');
	process.exit(1);
}
var cl = new xmpp.Client({ jid: argv[2],
	password: argv[3] });
cl.addListener('stanza', function(stanza){
	console.log(stanza);
});
cl.addListener('error',
		function(e) {
			sys.puts(e);
			process.exit(1);
		});
