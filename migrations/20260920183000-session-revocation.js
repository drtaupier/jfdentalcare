var dbm;
var type;
var seed;

exports.setup = function (options, seedLink) {
	dbm = options.dbmigrate;
	type = dbm.dataType;
	seed = seedLink;
};

exports.up = function (db) {
	return db.runSqlFile('sqls/20260920183000-session-revocation-up.sql');
};

exports.down = function (db) {
	return db.runSqlFile('sqls/20260920183000-session-revocation-down.sql');
};

exports._meta = {
	version: 1,
};
