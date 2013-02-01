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
	var jidBStr = jid.bare().toString();
	logger.info("In User(lib), jid in user find is : ", jidBStr);
	users.findOne({'jidB' : jidBStr}, {fields : {password : 1}}, function(err, doc) {
		assert.equal(err, null);
		if ((doc === null) || (doc.password === null)) {
			logger.debug("In User(lib), No entry for jid : " +  jidBStr + " in users");
			cb(null);
		}
		else {
			logger.info("In User(lib), Password for jid : " + jidBStr + " is " + doc.password);
			cb(new User(jid, doc));
		}
	});
};

User.prototype.save = function(callback) {
    var self = this;
	users.save({'jidB' : self.jid.bare().toString(), 'password' : self.attrs.password}, {w : 1}, function (err, res) {
		callback(err);
	});
};

// TOFIX : race condition!
User.register = function(jid, password, options) {
	users.findOne({'jidB' : jid.bare().toString()}, function (err,doc){
		if (err || doc){
			options.error("There is already a user with this jid");	
		} else{
			var user = new User(jid, {'password' : password});
			user.save(function(err) {
				if(err != null){
					options.error("Unable to save user in DB");
				}else{
					options.success(user);
				}
            });
		}
	}); 
}

exports.User = User;


function isEmpty(ob){
   for(var i in ob){ if(ob.hasOwnProperty(i)){return false;}}
  return true;
}
