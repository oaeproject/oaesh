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
        .usage('Usage: login-to-tenant --tenant=<tenant alias>')

        .alias('t', 'tenant')
        .describe('t', 'The tenant alias to login to');

module.exports = {
    'description': 'Log in as the global admin to a tenant.',
    'help': _yargs.help(),
    'invoke': function(session, args, callback) {
        var globalAdminRestCtx = session.env('current').ctx;
        var argv = _yargs.parse(args);

        if (!ArgsUtil.string(argv.t)) {
            throw new ValidationError('tenant', 'Required parameter', _yargs.help());
        }

        RestAPI.Admin.getSignedTenantAuthenticationRequestInfo(globalAdminRestCtx, argv.t, function(err, requestInfo) {
            if (err) {
                throw new HttpError(err.code, err.msg);
            }

            var adminUrlParsed = url.parse(globalAdminRestCtx.host);
            var targetUrlParsed = url.parse(requestInfo.url);

            // Create a new rest context for the target tenant, maintaining the protocol, which is mostly
            // useful for testing scenarios
            var onTenantRestCtx = new RestContext(util.format('%s//%s', adminUrlParsed.protocol, targetUrlParsed.host), {
                'hostHeader': targetUrlParsed.host,
                'strictSSL': globalAdminRestCtx.strictSSL
            });

            // Perform the actual login
            RestAPI.Admin.doSignedAuthentication(onTenantRestCtx, requestInfo.body, function(err) {
                if (err) {
                    throw new HttpError(err.code, err.msg);
                }

                onTenantRestCtx.username = globalAdminRestCtx.username;
                OaeshUtil.switchContext(session, onTenantRestCtx, function(err) {
                    if (err) {
                        throw new HttpError(err.code, err.msg);
                    }

                    return callback();
                });
            });
        });
    }
};
