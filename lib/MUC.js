var util = require('util');
var db = PROJECTX.db;
var assert = PROJECTX.assert;
var logger = PROJECTX.logger;
var mucCollection = null;
var membershipCollection = null;
var xmpp = require('node-xmpp');

db.collection('muc', function(err, collection) {
	assert.equal(err, null);
	mucCollection = collection;
	logger.info("MUC collection defined and connected to");
});

db.collection('membership', function(err, collection) {
	assert.equal(err, null);
	membershipCollection = collection;
	logger.info("Membership collection defined and connected to");
});

/*
 * DB/In-memory : {groupJid: group_jid, groupSubject : subject_val, members: {list_of_member_jids}, ownerJid : owner_jid}
 */

var MUC = function(groupJid, ownerJid, memberJidBStrs, groupSubject) {
	this.groupJid = groupJid;
	this.ownerJid = ownerJid;
	if(memberJidBStrs) {
		this.memberJidBStrs = memberJidBStrs;
	} else {
		this.memberJidBStrs = [ownerJid.bare().toString()];
	}
	if(groupSubject) {
		this.groupSubject = groupSubject;
	} else {
		this.groupSubject = "";
	}
};

var Membership = function() {
};

MUC.prototype.save = function(cb) {
	var self = this;
	logger.info("In muc save request");
	logger.info("groupJid : "+self.groupJid.bare().toString());
	logger.info("ownerJid : "+self.ownerJid.bare().toString());
	logger.info("memberJidBStrs : "+self.memberJidBStrs);
	logger.info("groupSubject : "+self.groupSubject);
	mucCollection.update({'groupJid' : self.groupJid.bare().toString()}, {'groupJid' : self.groupJid.bare().toString(), 'ownerJid' : self.ownerJid.bare().toString(), 'members' : self.memberJidBStrs, 'groupSubject' : this.groupSubject}, {upsert:true, w : 1}, function(err, result) {
		if((result == 0) || (err != null)) {
			logger.error(err);
			logger.info("muc save request failed");
			cb(new Error('Upsert failed perhaps because DB connection failed'));
		} else {
			logger.info("muc save request successful");
			cb(null);
		}
	});
};

MUC.prototype.addMember = function(memberJid, cb) {
	var self = this;

	//Check if the person is already in the members list
	if(self.memberJidBStrs.indexOf(memberJid.bare().toString()) != -1) {
		//Why adding again?
		logger.error("Jid: " + memberJid.bare().toString() + " is already member of the group: "+self.groupJid.bare().toString());
		cb(new Error('Already a member'));
	}

	mucCollection.update({'groupJid' : self.groupJid.bare().toString()}, {'$addToSet' : {'members' : memberJid.bare().toString()}}, {w : 1}, function(err, result) {
		if((result == 0) || (err != null)) {
			logger.error(err);
			cb(new Error('upsert failed perhaps because db connection failed'));
		} else {
			Membership.addGroup(memberJid, self.groupJid, function (error) {
				if(error == null) {
					self.memberJidBStrs.push(memberJid.bare().toString());
					cb(null);
				} else {
					cb(error);
				}
			});
		}
	});
};

Membership.addGroup = function(userJid, groupJid, cb) {
	logger.info("In Membership addGroup");
	logger.info("userJid : "+userJid.bare().toString());
	logger.info("groupJid : "+groupJid.bare().toString());
	membershipCollection.update({'jid' : userJid.bare().toString()}, {'$addToSet' : {'groupJids' : groupJid.bare().toString()}}, {upsert:true, w : 1}, function(err, result) {
		if((result == 0) || (err != null)) {
			logger.error(err);
			cb(new Error('Upsert failed perhaps because DB connection failed'));
		} else {
			cb(null);
		}
	});
};

MUC.prototype.removeMember = function(memberJid, cb) {
	var self = this;

	//Check if the person is in the members list or not

	if (self.memberJidBStrs.indexOf(memberJid.bare().toString()) == -1) {
		//Why removing?
		logger.error("Jid: " + memberJid.bare().toString() + " is not a member of the group: "+self.groupJid.bare().toString());
		cb(new Error('Not a member'));
	} else {
		mucCollection.update({'groupJid' : self.groupJid.bare().toString()}, {'$pull' : {'members' : memberJid.bare().toString()}}, {w : 1}, function(err, result) {
			if((result == 0) || (err != null)) {
				logger.error(err);
				cb(new Error('upsert failed perhaps because db connection failed'));
			} else {
				Membership.removeGroup(memberJid, self.groupJid, function (error) {
					if(error == null) {
						var index = self.memberJidBStrs.indexOf(memberJid.bare().toString());
						self.memberJidBStrs.splice(index, 1);
						cb(null);
					} else {
						cb(error);
					}
				});
			}
		});
	}
};

Membership.removeGroup = function(userJid, groupJid, cb) {
	membershipCollection.update({'jid' : userJid.bare().toString()}, {'$pull' : {'groupJids' : groupJid.bare().toString()}}, {w : 1}, function(err, result) {
		if((result == 0) || (err != null)) {
			logger.error(err);
			cb(new Error('Removal failed perhaps because DB connection failed'));
		} else {
			cb(null);
		}
	});
};

MUC.find = function(groupJid, cb) {
	logger.info("In MUC lib, finding group for the groupJid: "+groupJid.bare().toString());
	mucCollection.findOne({groupJid : groupJid.bare().toString()}, function(err, doc){
		if(err != null) {
			logger.error(err);
			cb(null);
		}
		if(doc == null) {
			cb(null);
		}
		else {
			cb(new MUC(new xmpp.JID(doc.groupJid), new xmpp.JID(doc.ownerJid), doc.members, doc.groupSubject));
		}
	});
};

Membership.find = function(userJid, cb) {
	logger.info("In MUC lib, finding groups for the userJid: "+ userJid.bare().toString());
	membershipCollection.findOne({jid : userJid.bare().toString()}, function(err, doc){
		if(err != null) {
			logger.error(err);
			cb(null);
		}
		if(doc == null) {
			cb(null);
		}
		else {
			cb(doc.groupJids);
		}
	});
};

MUC.changeSubject = function(groupJid, subject) {
	mucCollection.update({'groupJid' : groupJid.bare().toString()}, {'$set' : {'groupSubject' : subject}}, {w : 1}, function(err, result) {
		if((result == 0) || (err != null)) {
			logger.error(err);
			logger.error('Group subject change failed for group : '+ groupJid.bare().toString() + ' and subject : '+subject);
			//cb(new Error('Group subject change failed'));
		} else {
			//cb(null);
			logger.info('Group subject change successful for group : '+ groupJid.bare().toString() + ' and subject : '+subject);
		}
	});
};

exports.MUC = MUC;
exports.Membership = Membership;
