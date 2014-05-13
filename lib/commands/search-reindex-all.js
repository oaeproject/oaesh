
var HttpError = require('../errors/http');

var OaeshUtil = require('../util');
var RestAPI = require('oae-rest');

module.exports = {
    'description': 'Reindex all documents in the search index.',
    'help': 'Usage: search-reindex-all',
    'invoke': function(session, args, callback) {
        var globalAdminRestCtx = session.env('current').ctx;
        RestAPI.Search.reindexAll(globalAdminRestCtx, function(err) {
            if (err) {
                throw new HttpError(err.code, err.msg);
            }

            console.log('Re-indexing started');
            return callback();
        });
    }
};
