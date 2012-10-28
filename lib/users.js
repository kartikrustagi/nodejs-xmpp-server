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

User.key = function(jid) {
    return "user:" + jid.toString();
};

User.find = function(jid, cb) {
    var self = this;
	jid = jid.user; //TODO: Will go once me move away from jid
	logger.info("jid in authentication is : ", jid);
	users.findOne({'jid':jid}, {fields:{password:1}}, function(err, doc) {
		assert.equal(err, null);
		if ((doc === null) || (doc.password === null)) {
			logger.debug("No entry for jid : " +  jid + " in users");
			cb(null);
		}
		else {
			logger.info("Password for jid : " + jid + " is " + doc.password);
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

*/
User.prototype.save = function(callback) {
    var self = this;
	//console.log("inside save jid  = " + self.jid);
	//console.log("inside save password = " + self.password);
	users.save({"jid":self.jid, "password":self.attrs.password}, function(err, res){callback();});
};

// TOFIX : race condition!
User.register = function(jid, password, options) {
	//console.log("inside register jid = " + jid)
	//console.log("inside register password = " + password)
	//console.log("inside register options = " + options)
	users.findOne({"jid":jid.toString()}, function (err,doc){
		if (err || doc){
			//console.log("User Exists");
			options.error("There is already a user with this jid");	
		} else{
			var user = new User(jid.toString(), {password: password});
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


// var u = new exports.User();
// u.find("julien@localhost", function() {
//     console.log(u);
// })
