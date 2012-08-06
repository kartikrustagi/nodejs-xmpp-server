var assert = PROJECTX.assert;
var logger = PROJECTX.logger;
var db = PROJECTX.db;
var users = null;

db.open(function(err, db) {
	assert.equal(err, null);
	db.collection('users', function(err, collection) {
		assert.equal(err, null);
		users = collection;
		logger.info("User collection defined and connected to");
	});
});


var User = function(jid, attributes) {
    this.jid = jid;
    this.attrs = {};
    if(typeof(attributes) !== undefined) {
        this.attrs = attributes;
    }
};

User.key = function(jid) {
    return "user:" + jid.toString();
};

User.find = function(jid, cb) {
    var self = this;
	users.findOne({'jid':jid}, {fields:{password:1}}, function(err, doc) {
		assert.equal(err, null);
		logger.debug("Password for jid : %s is %s", jid, doc.toString());
		if (doc.password === null) {
			logger.debug("No entry for jid %s in users", jid);
			cb(null);
		}
		else {
			cb(new User(jid, doc));
		}
	});
};

/*
//No immediate use of all these functions 

User.prototype.delete = function(callback) {
    var self = this;
    client.del(User.key(this.jid), function(err, obj) {
        callback(err, self);
    });
};


User.prototype.save = function(callback) {
    var self = this;
    client.hmset(User.key(this.jid), this.attrs, function(err, obj) {
        callback(err, self);
    });
};

// TOFIX : race condition!
User.register = function(jid, password, options) {
    User.find(jid, function(user) {
        if(user && !options.force) {
            options.error("There is already a user with that jid");
        } else {
            var user = new User(jid, {password: password});
            user.save(function() {
                options.success(user);
            });
        }
    });
    
}
*/
exports.User = User;


function isEmpty(ob){
   for(var i in ob){ if(ob.hasOwnProperty(i)){return false;}}
  return true;
}


// var u = new exports.User();
// u.find("julien@localhost", function() {
//     console.log(u);
// })
