const HttpError = require('../errors/http');

const OaeshUtil = require('../util');
const RestAPI = require('oae-rest');

module.exports = {
	description: 'Reindex all documents in the search index.',
	help: 'Usage: search-reindex-all',
	invoke(session, args, callback) {
		const globalAdminRestCtx = session.env('current').ctx;
		RestAPI.Search.reindexAll(globalAdminRestCtx, function (err) {
			if (err) {
				throw new HttpError(err.code, err.msg);
			}

			console.log('Re-indexing started');
			return callback();
		});
	}
};
