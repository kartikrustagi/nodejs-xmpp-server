#!/usr/bin/env node

//Global Application object
PROJECTX = {};

//Setting up application wide logging
var logger = require('winston');
PROJECTX.logger = logger;

var assert = require('assert');
PROJECTX.assert = assert;

//Setting config
var path = require('path'), config = require('jsconfig'), configFilePath = path.join(__dirname, 'config.js');
config.load(configFilePath, function () {
	PROJECTX.config = config;
	logger.info("Configuration file loaded");
});


(function () {
	//Initializing DB connection
	var mongo = require('mongodb'), db = new mongo.Db(PROJECTX.config.mongo_db, new mongo.Server(PROJECTX.config.mongo_domain, PROJECTX.config.mongo_port));
	logger.info("Mongo DB object created");
	PROJECTX.db = db;
	db.open(function(err, db) {
		assert.equal(err, null);
	});
	logger.info("Connected to DB");
}());

var server = require('./lib/server.js');
server.run(config, function() {
	logger.info("Server ready");
});
