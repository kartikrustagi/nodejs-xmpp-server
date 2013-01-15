var util = require('util');
var db = PROJECTX.db;
var assert = PROJECTX.assert;
var logger = PROJECTX.logger;
var contactCollection = null;
var rosterCollection = null;
var User = require('../lib/users.js').User;
var xmpp = require('node-xmpp');

/*
 * We store two things in DB:
 * ownerJidB => [list of jids of contact] #rosters collection #{key => value, contactJIDs => [list of jids of contact]}
 * Contact.key => [subscription and name for this contact] #contacts collection #{key => value, contactInfo => [subscription and name for this contact]}
 */

db.collection('rosters', function(err, collection) {
	assert.equal(err, null);
	rosterCollection = collection;
	logger.info("Roster collection defined and connected to");
});
db.collection('contacts', function(err, collection) {
	assert.equal(err, null);
	contactCollection = collection;
	logger.info("Contact collection defined and connected to");
});

/*
 * In-memory : {ownerJid: ownerJid, contacts: {contactJidBStr : {contact}}
 */
var Roster = function(ownerJid) {
    this.ownerJid = ownerJid;
    this.contacts = {};
};

/*
 * In-memory: Represents a contact 
 */
var Contact = function(contactJid, subscription, name) {
    this.contactJid = contactJid;
    this.subscription = subscription;
    this.name = name;
};

Contact.key = function(ownerJid, contactJid) {
    return ownerJid.bare().toString() + ":" + contactJid.bare().toString();
};

Roster.find = function(ownerJid, cb) {
    var roster = new Roster(ownerJid);
    roster.refresh(cb);
	return roster;
};

Roster.prototype.refresh = function(cb) {
    var self = this;
    rosterCollection.findOne({'key' : self.ownerJid.bare().toString()}, {contactJidBs : 1}, function(err, doc) {
		var contactJidBStrs = null;
		if((!doc) || (err != null)){
			if(err != null) {
				logger.error(err);
			}
			cb(self);
		} else {
			contactJidBStrs = doc.contactJidBs;
			if((!contactJidBStrs) || (contactJidBStrs.length == 0)) {
				cb(self);
			} else {
				//Create the roster
				var counts = 0;
				self.contacts = {}; //clear the current contacts
				contactJidBStrs.forEach(function(contactJidBStr) {
					Contact.find(self.ownerJid, new xmpp.JID(contactJidBStr), function(contact) {
						counts++;
						if(contact == null){
							return;
						}
						self.contacts[contactJidBStr] = contact;
						if(counts == contactJidBStrs.length) {
							cb(self);
						}
					});
				});
			}
		}
    });
};

Contact.find = function(ownerJid, contactJid, cb) {
	var self = this;
	contactCollection.findOne({key: Contact.key(ownerJid, contactJid)}, function(err, doc){
		if(err != null) {
			logger.error(err);
			cb(null);
		}
		if(doc == null) {
			cb(null);
		}
		else {
			cb(new Contact(contactJid, doc.subscription, doc.name));
		}
	});
};

Roster.prototype.addContact = function(contactJid, name, callback) {
    var self = this;
	User.find(contactJid, function(user) {
		if(user == null){
			callback(new Error('Not an active user'));
			return;
		}
		var contact = new Contact(contactJid, 'both', name);
		rosterCollection.update({'key' : self.ownerJid.bare().toString()}, {'$addToSet' : {'contactJidBs' : contactJid.bare().toString()}}, {upsert:true, w : 1}, function(err, result) {
			if((result == 0) || (err != null)) {
				logger.error(err);
				callback(new Error('Upsert failed perhaps because DB connection failed'));
			}
			contactCollection.update({'key' : Contact.key(self.ownerJid, contactJid)}, {'key' : Contact.key(self.ownerJid, contactJid), 'subscription' : contact.subscription, 'name' : contact.name}, {upsert:true, w : 1}, function(err, result) {
				if((result == 0) || (err != null)) {
					logger.error(err);
					callback(new Error('Upsert failed perhaps because DB connection failed'));
				}else{
					self.contacts[contactJid.bare().toString()] = contact;
					callback(null);
				}
			});
		});
	});
};

Roster.prototype.deleteContact = function(contactJid, callback) {
	//No xmpp documentation on how to handle invalid requests
    var self = this;
	rosterCollection.update({'key' : self.ownerJid.bare().toString()}, {'$pull' : {'contactJidBs' : contactJid.bare().toString()}}, {w : 1}, function(err, numOfRemovedDocs){
		if((numOfRemovedDocs == 0) || (err != null)) {
			logger.error(err);
			callback(new Error('Deletion failed as either contact does not exist or DB connection failed'));
			return;
		}
		contactCollection.remove({key : Contact.key(self.ownerJid, contactJid)}, {w : 1}, function(err, numOfRemovedDocs) {
			console.log("In deleteContact, count of entries deleted in contactCollection");
			console.log(numOfRemovedDocs);
			console.log(err);
			if((numOfRemovedDocs == 0) || (err != null)) {
				logger.error(err);
				callback(new Error('Deletion failed as either contact does not exist or DB connection failed'));
			}else{
				console.log("In deleteContact");
				console.log(self);
				delete self.contacts[contactJid.bare().toString()];
				console.log("In deleteContacti post deletion");
				console.log(self);
				callback(null);
			}
		});
	});
};

exports.Roster = Roster;
exports.Contact = Contact;

function isEmpty(ob){
   for(var i in ob){ if(ob.hasOwnProperty(i)){return false;}}
  return true;
}
