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
 * RosterItem.key => [state and name for this contact] #contacts collection #{key => value, contactInfo => [state and name for this contact]}
 */

db.open(function(err, db) {
	assert.equal(err, null);
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
});

/*
 * In-memory : {owner: Roster.key, contacts: list of contacts[RosterItem]}
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
var RosterItem = function(roster, jid, state, name) {
    this.roster = roster;
    this.jid = jid;
    this.state = state;
    this.name = name;
}

Roster.key = function(jid) {
    return "roster:" + jid.toString();
};

RosterItem.key = function(owner, jid) {
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
        contactJIDs = doc.contactJIDs;
        if((!contactJIDs) || (contactJIDs.length == 0)) {
            cb(self);
        }
        else {
            //Create the roster
            self.contacts = []; //clear the current contactJIDs
            contactJIDs.forEach(function(contactJID) {
                RosterItem.find(self, contactJID, function(contact) {
                    counts++;
                    self.contacts.push(contact);
                    if(counts == contactJIDs.length) {
                        cb(self);
                    }
                });
            });
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
    RosterItem.find(self, jid, function(contact) {
        callback(contact);
    });
};

Roster.prototype.subscriptions = function(types, callback) {
    // TODO
};

Roster.prototype.add = function(jid, callback) {
    var self = this;
    self.itemForJid(jid, function(item) {
        // And now also add the jid to the set
        client.sadd(Roster.key(self.owner), item.jid, function(err, obj) {
            callback(item);
        });
    });
};

RosterItem.prototype.save = function(callback) {
    var self = this;
    client.hmset(RosterItem.key(self.roster.owner, self.jid), {state: self.state, name: self.name}, function(err, obj) {
        self.roster.add(self.jid, function() {
            callback(err, self);
        });
    });
}

RosterItem.prototype.delete = function(callback) {
    var self = this;
    contactCollection.remove(RosterItem.key(self.roster.owner, self.jid), function(err, numberOfRemovedDocs){
        assert.equal(null, err);
        rosterCollection.findOne(Roster.key(self.roster.owner), {contactJIDs: 1}, function(err, doc){
                assert.equal(null, err);
                if(doc == null) {
                }
            }
        }
    });



    client.del(RosterItem.key(self.roster.owner, self.jid), function(err, obj) {
        client.srem(Roster.key(self.roster.owner), self.jid, function(err, obj) {
            callback(err, self);
        });
    });
}

RosterItem.find = function(roster, jid, cb) {
    var self = this;
    contactCollection.findOne({key: RosterItem.key(roster.owner, jid)}, {contactInfo:1}, function(err, doc){
		    assert.equal(err, null);
        if(doc == null) {
            cb(new RosterItem(roster, jid, "none", ""));
        }
        else {
            cb(new RosterItem(roster, jid, doc.state, doc.name));
        }
    });
}

exports.Roster = Roster;
exports.RosterItem = RosterItem;


function isEmpty(ob){
   for(var i in ob){ if(ob.hasOwnProperty(i)){return false;}}
  return true;
}
