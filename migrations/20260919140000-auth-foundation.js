'use strict';

var fs = require('fs');
var path = require('path');
var Promise;

exports.setup = function (options) {
	Promise = options.Promise;
};

function runSqlFile(db, filename) {
	var filePath = path.join(__dirname, 'sqls', filename);
	return new Promise(function (resolve, reject) {
		fs.readFile(filePath, { encoding: 'utf-8' }, function (error, data) {
			if (error) return reject(error);
			resolve(data);
		});
	}).then(function (data) {
		return db.runSql(data);
	});
}

exports.up = function (db) {
	return runSqlFile(db, '20260919140000-auth-foundation-up.sql');
};

exports.down = function (db) {
	return runSqlFile(db, '20260919140000-auth-foundation-down.sql');
};

exports._meta = { version: 1 };
