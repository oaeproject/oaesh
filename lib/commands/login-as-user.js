var url = require('url');
var util = require('util');
var yargs = require('yargs');

var HttpError = require('../errors/http');
var ValidationError = require('../errors/validation');

var ArgsUtil = require('./util/args');
var OaeshUtil = require('../util');
var RestAPI = require('oae-rest');
var RestContext = require('oae-rest/lib/model').RestContext;

var _yargs = new yargs()
        .usage('Usage: login-as-user --user-id=<user id>')

        .alias('u', 'user-id')
        .describe('u', 'The ID of the user who you wish to authenticate as');

module.exports = {
    'description': 'Log in as a specified user to their tenant.',
    'help': _yargs.help(),
    'invoke': function(session, args, callback) {
        var adminRestCtx = session.env('current').ctx;
        var argv = _yargs.parse(args);

        if (!ArgsUtil.string(argv.u)) {
            throw new ValidationError('user-id', 'Required parameter', _yargs.help());
        }

        RestAPI.Admin.getSignedBecomeUserAuthenticationRequestInfo(adminRestCtx, argv.u, function(err, requestInfo) {
            if (err) {
                throw new HttpError(err.code, err.msg);
            }

            var adminUrlParsed = url.parse(adminRestCtx.host);
            var targetUrlParsed = url.parse(requestInfo.url);

            // Create a new rest context for the target tenant, maintaining the protocol, which is mostly
            // useful for testing scenarios
            var userRestCtx = new RestContext(util.format('%s//%s', adminUrlParsed.protocol, targetUrlParsed.host), {
                'hostHeader': targetUrlParsed.host,
                'strictSSL': adminRestCtx.strictSSL
            });

            // Perform the actual login
            RestAPI.Admin.doSignedAuthentication(userRestCtx, requestInfo.body, function(err) {
                if (err) {
                    throw new HttpError(err.code, err.msg);
                }

                OaeshUtil.switchContext(session, userRestCtx, function(err) {
                    if (err) {
                        throw new HttpError(err.code, err.msg);
                    }

                    return callback();
                });
            });
        });
    }
};
