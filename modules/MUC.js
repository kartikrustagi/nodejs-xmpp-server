var xmpp = require('node-xmpp');
var logger = PROJECTX.logger;
var xmpp = require('node-xmpp');
var MUC = require('../lib/MUC.js').MUC;
var Membership = require('../lib/MUC.js').Membership;

exports.configure = function(server, config) {

	server.on('connect', function(client) {

		client.on('create-join-room', function(stanza) {
			//Comming from presence
			var groupJid = (new xmpp.JID(stanza.attrs.to)).bare();
			var ownerJid = (client.jid).bare();
			var muc = new MUC(groupJid, ownerJid);
			logger.info("In MUC module, create/join room request: ");
			logger.info("groupJid: "+groupJid.toString());
			logger.info("ownerJid: "+ownerJid.toString());

			var createGroup = function() {
				muc.save(function (error) {
					if(error != null) {
						//Some error happened, lets ignore the request
						logger.error("Some error happened in room creation");
					} else {
						//Modify owner's membership
						Membership.addGroup(ownerJid, groupJid, function (error) {
							if(error == null) {
								//On successful room creation send room creation acknowledgement
								logger.info("Room creation successful");
								var replyStanza = new xmpp.Element('presence', { from : stanza.attrs.to, to : stanza.attrs.from }).c('x', { xmlns : 'http://jabber.org/protocol/muc#user'}).c('item', {affiliation : 'owner', role : 'moderator'}).up().c('status', {code : '110'}).up().c('status', {code : '201'}).root();
								client.send(replyStanza);
							} else {
								//Some error happened, lets ignore the request
								logger.info("Room creation failed");
							}
						});
					}
				});
			};

			//Join or create request?
			MUC.find(groupJid, function(muc) {
				if(muc == null) {
					//Group does not exist
					logger.info("In MUC module, create room request");
					createGroup();
				} else {
					//Group does exist
					//But we will still go ahead with group creation if the request is comming from the owner
					if(muc.ownerJid.bare().toString() === ownerJid.bare().toString()) {
						logger.info("In MUC module, create room request");
						createGroup();
					} else{
						logger.info("In MUC module, join room request");
						client.emit('groupchat-room-join-notification', muc, ownerJid);
					}
				}
			});
			
		});

		client.on('groupchat-room-join-notification', function (muc, memberJid) {
			//Send all member's presence to the member
			var index = null;
			for(index in muc.memberJidBStrs) {
				var memberJidBStr = muc.memberJidBStrs[index];
				if(memberJidBStr != memberJid.bare().toString()) {
					var affiliation = 'member';
					var role = 'participant';
					if(memberJidBStr === muc.ownerJid.bare().toString()) {
						affiliation = 'owner';
						role = 'moderator';
					}

					var presence = new xmpp.Element('presence', {from : (muc.groupJid.bare().toString()+"/"+memberJidBStr), id : 'notification', to : memberJid.bare().toString()}).c('x', {xmlns : 'http://jabber.org/protocol/muc#user'}).c('item', {affiliation : affiliation, role : role}).root(); 
					client.server.cluster.publish(memberJid.bare().toString(), presence, function(subCount){});
				}
			}

			//Send presence of joined member to all members (excluding self)
			index = null;
			for(index in muc.memberJidBStrs) {
				var memberJidBStr = muc.memberJidBStrs[index];
				if(memberJidBStr != memberJid.bare().toString()) {
					var affiliation = 'member';
					var role = 'participant';
					if(memberJid.bare().toString() === muc.ownerJid.bare().toString()) {
						affiliation = 'owner';
						role = 'moderator';
					}

					var presence = new xmpp.Element('presence', {from : (muc.groupJid.bare().toString()+"/"+memberJid.bare().toString()), id : 'notification', to : memberJidBStr}).c('x', {xmlns : 'http://jabber.org/protocol/muc#user'}).c('item', {affiliation : affiliation, role : role}).root(); 
					client.server.cluster.publish(memberJidBStr, presence, function(subCount){});
				}
			}

			//Send self presence to the joined member
			var affiliation = 'member';
			var role = 'participant';
			if(memberJid.bare().toString() === muc.ownerJid.bare().toString()) {
				affiliation = 'owner';
				role = 'moderator';
			}

			var presence = new xmpp.Element('presence', {from : (muc.groupJid.bare().toString()+"/"+memberJid.bare().toString()), id : 'notification', to : memberJid.bare().toString()}).c('x', {xmlns : 'http://jabber.org/protocol/muc#user'}).c('item', {affiliation : affiliation, role : role}).root(); 
			client.server.cluster.publish(memberJid.bare().toString(), presence, function(subCount){});

			//All notifications sent. Lets send offline messages
			client.emit("groupchat-offline-messages", muc.groupJid);

		});

		client.on('stanza', function(stanza) {
			//Check for MUC instruction queries
			if (stanza.is('iq') && stanza.attrs.to) {
				var toJid = new xmpp.JID(stanza.attrs.to);
				if (toJid.domain === PROJECTX.config.muc_domain) {
					if ( (stanza.attrs.type && (stanza.attrs.type === 'set')) && (stanza.getChild('query') && stanza.getChild('query').attrs.xmlns === "http://jabber.org/protocol/muc#owner") && (stanza.getChild('query').getChild('x') && stanza.getChild('query').getChild('x').attrs.xmlns === "jabber:x:data" && (stanza.getChild('query').getChild('x').attrs.type === "submit")) ) {
						//Instant room request by the owner
						logger.info("Instant room request toJid : "+toJid.toString()+" from : "+client.jid.toString());
						client.send(new xmpp.Element('iq', {from : toJid.toString(), id : stanza.attrs.id, to : client.jid.toString(), type : 'result' }));
						//Not doing anything
					} else if ((stanza.attrs.type && (stanza.attrs.type === 'get')) && (stanza.getChild('query'))) {
						if (stanza.getChild('query').attrs.xmlns === 'http://jabber.org/protocol/disco#info') {
								//IMHO it is asking for room info
								logger.info('IMHO it is asking for room info');
								client.emit('groupchat-room-info', toJid.bare(), stanza);
						} else if (stanza.getChild('query').attrs.xmlns === 'http://jabber.org/protocol/muc#admin') {
							if (stanza.getChild('query').getChild('item').attrs.affiliation === "member") {
								//Asking for group members
								logger.info('Asking for group members');
								client.emit('groupchat-room-members', toJid.bare(), stanza);
							}
						} else if (stanza.getChild('query').attrs.xmlns === 'http://jabber.org/protocol/muc#owner') {
							if (stanza.getChild('query').getChild('item').attrs.affiliation === "owner") {
								//Asking for group owner
								client.emit('groupchat-room-owner', toJid.bare(), stanza);
							}
						}
					}
				} else if (toJid.bare().toString() === client.jid.bare().toString()) {
						if (stanza.getChild('query').attrs.xmlns === 'http://jabber.org/protocol/disco#items') {
							if (stanza.getChild('query').attrs.node === 'http://jabber.org/protocol/muc#rooms') {
								//User is asking for current rooms
								logger.info('User is asking for current rooms');
								client.emit('groupchat-current-rooms', client.jid, stanza);
							} 					
						}
				}
			}
		});

		client.on('groupchat-room-info', function(groupJidB, stanza) {
			MUC.find(groupJidB, function(muc) {
				if (muc == null) {
					//Invalid entry, ignoring for now
				} else {
					//We have the muc
					var reply = new xmpp.Element('iq', {type : 'result', from : groupJidB.toString(), id : stanza.attrs.id, to : client.jid.toString()}).c('query', 
						{xmlns : 'http://jabber.org/protocol/disco#info'}).c('identity',
							{category : 'conference', type : 'text', name: muc.groupSubject}).up().c('feature',
							{'var' : 'http://jabber.org/protocol/muc'}).up().c('feature',
							{'var' : 'muc_membersonly'}).up().c('x',
							{xmlns : 'jabber:x:data', type : 'result'}).c('field',
							{'var' : 'FORM_TYPE', type : 'hidden'}).c('value').t('http://jabber.org/protocol/muc#roominfo').up().up().c('field',
							{'var' : 'muc#roominfo_description', 'label' : 'Description'}).c('value').t(muc.groupSubject).up().up().c('field',
							{'var' : 'muc#roominfo_subject', 'label' : 'Subject'}).c('value').t(muc.groupSubject).up().up().c('field',
							{'var' : 'muc#roominfo_occupants', 'label' : 'Number of occupants'}).c('value').t(muc.memberJidBStrs.length).root();
					client.send(reply);
				}
			});
		});


		client.on('groupchat-room-members', function(groupJidB, stanza) {
			MUC.find(groupJidB, function(muc) {
				if (muc == null) {
					//Invalid entry, ignoring for now
				} else {
					//We have the muc
					var reply = new xmpp.Element('iq', {type : 'result', from : groupJidB.toString(), id : stanza.attrs.id, to : client.jid.toString()}).c('query', 
						{xmlns : 'http://jabber.org/protocol/muc#admin'});
					var index = null;
					var aff = 'member';
					var role = 'participant';
					var memberJidBStr = null;
					for (index in muc.memberJidBStrs) {
						aff = 'member';
						role = 'participant';
						memberJidBStr = muc.memberJidBStrs[index];
						if (memberJidBStr === muc.ownerJid.bare().toString()) {
							//aff = 'owner';
							//role = 'moderator';
							continue;
						}
						reply.c('item', {affiliation : aff, role : role, jid : memberJidBStr, nick : memberJidBStr}).up();
					}
					client.send(reply.root());
				}
			});
		});

		client.on('groupchat-room-owner', function(groupJidB, stanza) {
			MUC.find(groupJidB, function(muc) {
				if (muc == null) {
					//Invalid entry, ignoring for now
				} else {
					//We have the muc
					var reply = new xmpp.Element('iq', {type : 'result', from : groupJidB.toString(), id : stanza.attrs.id, to : client.jid.toString()}).c('query', 
						{xmlns : 'http://jabber.org/protocol/muc#owner'});
					reply.c('item', {affiliation : 'owner', role : 'moderator', jid : muc.ownerJid.bare().toString(), nick : muc.ownerJid.bare().toString()}).up();
					client.send(reply.root());
				}
			});
		});

		client.on('groupchat-current-rooms', function(userJid, stanza) {
			Membership.find(userJid, function(groupJidL) {
				stanza.attrs.from = stanza.attrs.to;
				stanza.attrs.to = client.jid.bare().toString();
				stanza.attrs.type = 'result';
				var reply = stanza.getChild('query');
				var index = null;
				for(index in groupJidL) {
					var groupJid = groupJidL[index];
					reply.c('item', {jid : groupJid}).up();
				}
				client.send(reply);
			});
		});

		client.on('groupchat-message-subject', function(stanza) {
			if(stanza.attrs.to) {
				var toJid = new xmpp.JID(stanza.attrs.to);
				if ((toJid.domain === PROJECTX.config.muc_domain) && (stanza.attrs.type && (stanza.attrs.type === 'groupchat'))) {
					var groupJid = toJid.bare();
					//Is subject change request?
					if (stanza.getChild('subject')) {
						//Subject change request
						var subject = stanza.getChildText('subject');
						MUC.changeSubject(groupJid, subject);
						logger.info('Emitting groupchat-route-message-stanza');
						client.emit('groupchat-route-message-stanza', true, stanza, groupJid);
					} else if (stanza.getChild('body')) {
						//Message for participants
						client.emit('groupchat-route-message-stanza', false, stanza, groupJid);
					}
				}else {
					//Wha???
					//Do nothing
				}
			}
		});

		client.on('groupchat-route-message-stanza', function(toSelf, stanza, groupJid) {
			logger.info('In groupchat-route-message-stanza');
			MUC.find(groupJid, function(muc) {
				var originJid = client.jid.bare();
				var originGroupJidStr = (groupJid.bare().toString()+'/'+originJid.bare().toString());
				stanza.attrs.from = originGroupJidStr;
				var clone = (function(){ 
					return function (obj) { Clone.prototype=obj; return new Clone() };
					function Clone(){}
				}());
				var index = null;
				for(index in muc.memberJidBStrs) {
					var memberJidBStr = muc.memberJidBStrs[index];
					if ((toSelf) || (memberJidBStr != originJid.bare().toString())) {
						var newStanza = clone(stanza);
						newStanza.attrs.to = memberJidBStr;
						client.server.cluster.publish(memberJidBStr, newStanza, function(subCount){
							if(subCount == 0) {
								//No one is subscribing to this
								logger.debug("Emitting Recepient Offline");
								client.server.router.emit("recipientOfflineGroupchat", stanza, groupJid);
							} else {
								//Some on subscribing to it received the message, job done
							}

						});
					}
				}
			});
		});

		client.on('groupchat-invite', function(stanza, cb) {
			//Sending an invite request. check for permission and modification to members list
			var inviterJid = client.jid;
			var groupJid = (new xmpp.JID(stanza.attrs.to)).bare();
			var inviteeJidB = (new xmpp.JID(stanza.getChild('x').getChild('invite').attrs.to)).bare();
			logger.info("Group invite from: "+inviterJid.toString()+" for: "+inviteeJidB.toString()+" to the group: "+groupJid.toString());

			//Group must already be existing in DB
			MUC.find(groupJid, function (muc) {
				//Is the person allowed to add members (only owner can do this)
				if(inviterJid.bare().toString() != muc.ownerJid.toString()) {
					// Operation not allowed
					// Should be blocked at client side. No action to be taken here
					logger.error("MUC module, how come this sender: "+inviterJid.toString()+" was able to send invite for the group: "+groupJid.toString());
				} else {
					//Good to go
					var existingMemberList = muc.members;
					muc.addMember(inviteeJidB, function(error) {
						cb(error, inviterJid, groupJid, inviteeJidB, muc.memberJidBStrs);
					});
				}
			});
		});

		client.on('groupchat-new-member-notification', function(groupJid, inviteeJid, memberJidBStrs) {
			//Iterate member list and send all the notification presence
			logger.info("In groupchat new member notification");
			var index = null;
			for(index in memberJidBStrs) {
				var memberJidBStr = memberJidBStrs[index];
				if(memberJidBStr != inviteeJid.bare().toString()) {
					var presence = new xmpp.Element('presence', {from : (groupJid.bare().toString()+"/"+inviteeJid.bare().toString()), id : 'notification', to : memberJidBStr}).c('x', {xmlns : 'http://jabber.org/protocol/muc#user'}).c('item', {affiliation : 'member', role : 'participant'}).root(); 
					client.server.cluster.publish(memberJidBStr, presence, function(subCount){});
				}
			}
			//Now let the invitee be informed
			var presence = new xmpp.Element('presence', {from : (groupJid.bare().toString()+"/"+inviteeJid.bare().toString()), id : 'notification', to : inviteeJid.toString()}).c('x', {xmlns : 'http://jabber.org/protocol/muc#user'}).c('item', {affiliation : 'member', role : 'participant'}).up().c('status', {code : '110'}).root(); 
			client.server.cluster.publish(inviteeJid.bare().toString(), presence, function(subCount){});
		});

		client.on('groupchat-room-exit', function(stanza) {
			var groupJid = (new xmpp.JID(stanza.attrs.to)).bare();
			var memberJid = client.jid;
			MUC.find(groupJid, function(muc) {
				if(muc == null) {
					//Killed
					logger.info("No group found");
					logger.info("Removing member: "+memberJid.bare().toString()+" from the group: "+groupJid.bare().toString()+" failed");
				} else {
					muc.removeMember(memberJid, function(error) {
						if(error != null) {
							//Killed
							logger.info("Removing member: "+memberJid.bare().toString()+" from the group: "+groupJid.bare().toString()+" failed");
						} else {
							logger.info("Member: "+memberJid.bare().toString()+" successfuly removed from the group: "+groupJid.bare().toString());
							//Send self presence
							var memberAff = 'member';
							if(memberJid.bare().toString() === muc.ownerJid.bare().toString()) {
								memberAff = 'owner';
							}
							var reply = new xmpp.Element('presence', 
								{
									from : (groupJid.bare().toString()+"/"+memberJid.bare().toString()),
									to : memberJid.bare().toString(),
									type : 'unavailable'
								}).c('x',
									{
										xmlns : 'http://jabber.org/protocol/muc#user'
									}).c('item',
										{
											affiliation : memberAff,
											jid : memberJid.bare().toString(),
											role : 'none'
										}).up().c('status', 
											{
												code : '110'
											}).root();
							 client.send(reply);

							 //Send notification to the rest of the members
							 var index = null;
							 for(index in muc.memberJidBStrs) {
								 var memberJidBStr = muc.memberJidBStrs[index];
								 if(memberJidBStr != memberJid.bare().toString()) {
									 var presence = new xmpp.Element('presence', 
										{
											from : (groupJid.bare().toString()+"/"+memberJid.bare().toString()),
											to : memberJidBStr,
											type : 'unavailable'
										}).c('x',
											{
												xmlns : 'http://jabber.org/protocol/muc#user'
											}).c('item',
												{
													affiliation : memberAff,
													jid : memberJid.bare().toString(),
													role : 'none'
												}).root();

									client.server.cluster.publish(memberJidBStr, presence, function(subCount){});
								 }
							 }
						}
					});
				}
			});
		});



	});
};
