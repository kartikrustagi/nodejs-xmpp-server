var util = require('util');
var EventEmitter = require('events').EventEmitter;
var db = PROJECTX.db;
var assert = PROJECTX.assert;
var logger = PROJECTX.logger;
var contactCollection = null;
var rosterCollection = null;

/*
 * We store two things in DB:
 * Roster.key => [list of jids of contact] #rosters collection #{key => value, contactJIDs => [list of jids of contact]}
 * RosterContact.key => [state and name for this contact] #contacts collection #{key => value, contactInfo => [state and name for this contact]}
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
 * In-memory : {owner: Roster.key, contacts: list of contacts[RosterContact]}
 */
var Roster = function(owner) {
    this.owner = owner;
    this.contacts = [];
    return this;
};
util.inherits(Roster, EventEmitter);

/*
 * In-memory: Represents a contact 
 */
var RosterContact = function(roster, jid, state, name) {
    this.roster = roster;
    this.jid = jid;
    this.state = state;
    this.name = name;
}

Roster.key = function(jid) {
    return "roster:" + jid.toString();
};

RosterContact.key = function(owner, jid) {
    return "rosterItem:" + owner.toString() + ":" + jid.toString();
}

Roster.find = function(jid, cb) {
    var roster = new Roster(jid);
    roster.refresh(cb);
};

Roster.prototype.refresh = function(cb) {
    var self = this;
    rosterCollection.findOne({key:Roster.key(self.owner)}, {contactJIDs:1}, function(err, doc){
		assert.equal(err, null);
		contactJIDs = null;
		if(!doc){
			cb(self);
		}else{
			contactJIDs = doc.contactJIDs;
			if((!contactJIDs) || (contactJIDs.length == 0)) {
				cb(self);
			}else{
				//Create the roster
				var counts = 0;
				self.contacts = []; //clear the current contactJIDs
				contactJIDs.forEach(function(contactJID) {
					RosterContact.find(self, contactJID, function(contact) {
						counts++;
						self.contacts.push(contact);
						if(counts == contactJIDs.length) {
							cb(self);
						}
					});
				});
			}
		}
    });
};

Roster.prototype.eachSubscription = function(types, callback) {
    var self = this;
    self.refresh(function() {
        self.contacts.forEach(function(contact) {
            if(types.indexOf(contact.state) >= 0) {
                callback(contact);
            }
        });
    });
};

Roster.prototype.itemForJid = function(jid, callback) {
    var self = this;
    RosterContact.find(self, jid, function(contact) {
        callback(contact);
    });
};

Roster.prototype.subscriptions = function(types, callback) {
    // TODO
};

Roster.prototype.add = function(jid, callback) {
    var self = this;
    self.itemForJid(jid, function(contact) {
        // And now also add the jid to the set
		rosterCollection.update({'key' : Roster.key(self.owner)}, {'$addToSet' : {'contactJIDs' : contact.jid}}, {upsert:true, safe:true}, function(err, result){
			callback(contact);
		});
    });
}

RosterContact.prototype.save = function(callback) {
    var self = this;
	logger.info("Save request for RosterContact with key: "+RosterContact.key(self.roster.owner, self.jid));
	contactCollection.update({'key':RosterContact.key(self.roster.owner, self.jid)}, {'key':RosterContact.key(self.roster.owner, self.jid), 'state':self.state, 'name':self.name}, {upsert:true, safe:true}, function(err, result){
		assert.equal(err, null);
		self.roster.add(self.jid, function(){
			callback(err, self);
		});
	});
}

RosterContact.prototype.delete = function(callback) {
	var self = this;
	contactCollection.remove({key : RosterContact.key(self.roster.owner, self.jid)}, {safe : true}, function(err, numberOfRemovedDocs){
		assert.equal(err, null);
		rosterCollection.update({'key' : Roster.key(self.roster.owner)}, {'$pull' : {'contactJIDs' : self.jid}}, {safe:true}, function(err, result){
			callback(err, self);
		});
	});
}

RosterContact.find = function(roster, jid, cb) {
	var self = this;
	contactCollection.findOne({key: RosterContact.key(roster.owner, jid)}, function(err, doc){
		assert.equal(err, null);
		if(doc == null) {
			cb(new RosterContact(roster, jid, "none", ""));
		}
		else {
			cb(new RosterContact(roster, jid, doc.state, doc.name));
		}
	});
}

exports.Roster = Roster;
exports.RosterContact = RosterContact;


function isEmpty(ob){
   for(var i in ob){ if(ob.hasOwnProperty(i)){return false;}}
  return true;
}
