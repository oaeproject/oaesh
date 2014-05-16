var _ = require('underscore');
var sprintf = require('sprintf-js').sprintf;
var url = require('url');
var yargs = require('yargs');

var HttpError = require('../errors/http');
var ValidationError = require('../errors/validation');

var OaeshUtil = require('../util');
var RestAPI = require('oae-rest');
var RestContext = require('oae-rest/lib/model').RestContext;

var _yargs = new yargs()
    .usage(
        'Usage: use [(<http>|<https>)://]<hostname>[:port] [--host-header=<hostHeader>]\n\n' +

        'If the protocol is omitted from the URL, HTTPS will be assumed in full secure fashion. If oaesh was started with the --insecure flag, ' +
        'it will be possible to establish connections to HTTPS sites with invalid certificates. This is useful for running commands against QA ' +
        'and test servers that have self-signed certificates installed, but should not be used in production environments.\n\n' +

        'Examples:\n\n' +

        '    use http://localhost\n' +
        '    use http://localhost --host-header=cam.oae.com\n' +
        '    use oae.oae-qa0.oaeproject.org'
    )

    .describe('host-header', 'The Host header to use in HTTP requests to the OAE tenant');

module.exports = {
    'description': _getShortDescription(),
    'help': _yargs.help(),
    'init': function(session, callback) {
        // Ensure the context hosts are set in the session
        var contexts = session.env('ctxs');
        if (!contexts) {
            session.env('ctxs', {});
        }

        var current = session.env('current');
        if (!current) {
            session.env('current', {});
        }

        return callback();
    },
    'invoke': function(session, args, callback) {
        var argv = _yargs.parse(args);
        var contexts = session.env('ctxs');

        var uri = argv._[0];
        if (!uri) {
            throw new ValidationError('first argument', 'The first argument must be a URL to use', _yargs.help());
        }

        // Get the RestContext that will be used for this tenant
        var restCtx = null;
        var parsed = _parseUri(uri);
        if (!_.isObject(contexts[parsed.host])) {
            var options = {};

            if (session.env('insecure')) {
                options.strictSSL = false;
            }

            if (_.isString(argv['host-header']) && !_.isEmpty(argv['host-header'])) {
                options.hostHeader = argv['host-header'];
            }

            // Take the trailing slash off the host
            restCtx = new RestContext(url.format(parsed).slice(0, -1), options);
        } else {
            restCtx = contexts[parsed.host];
        }

        OaeshUtil.switchContext(session, restCtx, function(err) {
            if (err) {
                throw new HttpError(err.code, err.msg);
            }

            // Ensure the ps1 is set for the current host and user (if any)
            session.env('ps1', 'oaesh:%(username)s@%(current.tenant.host)s$ '.bold);
            return callback();
        });
    }
};

function _getShortDescription() {
    return 'Set the current OAE host and protocol';
}

function _parseUri(uri) {
    var parsed = url.parse(uri);
    if (!parsed.protocol) {
        uri = 'https://' + uri;
        parsed = url.parse(uri);
    }

    uri = parsed.protocol + '//' + parsed.host;
    return url.parse(uri);
}
