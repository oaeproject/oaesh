
var HttpError = require('../errors/http');

var OaeshUtil = require('../util');
var RestAPI = require('oae-rest');

module.exports = {
    'description': 'Logout of the current session.',
    'help': 'Usage: logout',
    'invoke': function(session, args, callback) {
        var restCtx = session.env('current').ctx;
        RestAPI.Authentication.logout(restCtx, function(err) {
            if (err) {
                throw new HttpError(err.code, err.msg);
            }

            OaeshUtil.switchUser(session, restCtx, function(err) {
                if (err) {
                    throw new HttpError(err.code, err.msg);
                }

                return callback();
            });
        });
    }
};
