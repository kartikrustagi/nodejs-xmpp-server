var assert = PROJECTX.assert;
var logger = PROJECTX.logger;
var db = PROJECTX.db;

db.collection('privacy', function(err, collection) {
	assert.equal(err, null);
	privacy = collection;
	logger.info("privacy collection defined and connected to");
});

var Privacy = function() {
};

Privacy.retrieve = function(jid, list, cb) {
	privacy.findOne({"jid":jid}, function(err, doc){
		if (doc){
			cb (doc[list]);
		}
		else{
			privacy.save({"jid":jid, "default":[]}, function(){
				console.log("No privacy list for the user found. Default created");
				cb([]);
			});
		}
	});
};

Privacy.edit = function(jid, list, item, cb) {
	console.log(list);
	console.log(item.attrs.value);
	x = list.toString()+".value";
	console.log(x);
	privacy.findOne({"jid":jid, "default.value":item.attrs.value}, function(err, doc){
		if (doc){
		}
		else{
			privacy.update({"jid":jid}, {"$push":{"default":{"type":"jid", "value":item.attrs.value, "action":item.attrs.action}}}, function(error){
				cb(error);
			});
		}
	});	
};


exports.Privacy = Privacy;

function isEmpty(ob){
   for(var i in ob){ if(ob.hasOwnProperty(i)){return false;}}
  return true;
}
