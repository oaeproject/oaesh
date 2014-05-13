
var HttpError = require('../errors/http');
var RestAPI = require('oae-rest');

module.exports = {
    'description': 'Retrieve the "me" feed for the current user.',
    'help': 'Usage: me',
    'invoke': function(session, args, callback) {
        var restCtx = session.env('current').ctx;
        RestAPI.User.getMe(restCtx, function(err, me) {
            if (err) {
                throw new HttpError(err.code, err.msg);
            }

            // Output the me feed to the console
            console.log(JSON.stringify(me, null, 2));

            return callback();
        });
    }
};
