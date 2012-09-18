var util = require('util');
var EventEmitter = require('events').EventEmitter;
var db = PROJECTX.db;
var assert = PROJECTX.assert;
var logger = PROJECTX.logger;
var rosters = null;
var rosteritems = null;


db.open(function(err, db) {
	assert.equal(err, null);
	db.collection('rosters', function(err, collection) {
		assert.equal(err, null);
		rosters = collection;
		logger.info("Roster collection defined and connected to");
	});
  db.collection('rosteritems', function(err, collection) {
		assert.equal(err, null);
		rosteritems = collection;
		logger.info("RosterItems collection defined and connected to");
	});
});

/*
 * Collection : rosters
 * {owner:Roster.key, items:ArrayOfJIDs}
 * Stores owner and list of jids (contacts)
 */
var Roster = function(owner) {
    this.owner = owner;
    this.items = [];
    return this;
};
util.inherits(Roster, EventEmitter);

/*
 * Collection : rosteritems
 * {roster:RosterItem.key, details:{state:'state_value', name:'name_value'}}
 * Stores actual information of an contact(jid) for roster owner
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
    rosters.findOne({owner:Roster.key(self.owner)}, {items:1}, function(err, doc){
		    assert.equal(err, null);
        items = doc.items
        if((!items) || (items.length == 0)) {
            cb(self);
        }
        else {
            self.items = []; //clear the current items
            items.forEach(function(contact) {
                RosterItem.find(self, contact, function(item) {
                    counts++;
                    self.items.push(item);
                    if(counts == items.length) {
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
        self.items.forEach(function(item) {
            if(types.indexOf(item.state) >= 0) {
                callback(item);
            }
        });
    });
};

Roster.prototype.itemForJid = function(jid, callback) {
    var self = this;
    RosterItem.find(self, jid, function(item) {
        callback(item);
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
    rosteritems.remove(RosterItem.key(self.roster.owner, self.jid), function(err, numberOfRemovedDocs){
        assert.equal(null, err);
    });



    client.del(RosterItem.key(self.roster.owner, self.jid), function(err, obj) {
        client.srem(Roster.key(self.roster.owner), self.jid, function(err, obj) {
            callback(err, self);
        });
    });
}

RosterItem.find = function(roster, jid, cb) {
    var self = this;
    rosteritems.findOne({roster:RosterItem.key(roster.owner, jid)}, {details:1}, function(err, doc){
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
