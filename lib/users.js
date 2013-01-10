var assert = PROJECTX.assert;
var logger = PROJECTX.logger;
var db = PROJECTX.db;
var users = null;

db.collection('users', function(err, collection) {
	assert.equal(err, null);
	users = collection;
	logger.info("User collection defined and connected to");
});

var User = function(jid, attributes) {
    this.jid = jid;
    this.attrs = {};
    if(typeof(attributes) !== undefined) {
        this.attrs = attributes;
    }
};

User.find = function(jid, cb) {
    var self = this;
	var jidStr = jid.toString();
	logger.info("jid in authentication is : ", jidStr);
	users.findOne({'jidStr' : jidStr}, {fields : {password : 1}}, function(err, doc) {
		assert.equal(err, null);
		if ((doc === null) || (doc.password === null)) {
			logger.debug("No entry for jid : " +  jidStr + " in users");
			cb(null);
		}
		else {
			logger.info("Password for jid : " + jidStr + " is " + doc.password);
			cb(new User(jid, doc));
		}
	});
};

/*
//No immediate use of all these functions 
User.prototype.delete = function(callback) {
    var self = this;
    client.del(this.jid.toString(), function(err, obj) {
        callback(err, self);
    });
};
*/

User.prototype.save = function(callback) {
    var self = this;
	users.save({'jidStr' : self.jid.toString(), 'password' : self.attrs.password}, function (err, res) {
		callback();
	});
};

// TOFIX : race condition!
User.register = function(jid, password, options) {
	users.findOne({'jidStr' : jid.toString()}, function (err,doc){
		if (err || doc){
			options.error("There is already a user with this jid");	
		} else{
			var user = new User(jid, {'password' : password});
			user.save(function() {
                options.success(user);
            });
		}
	}); 
}

exports.User = User;


function isEmpty(ob){
   for(var i in ob){ if(ob.hasOwnProperty(i)){return false;}}
  return true;
}
