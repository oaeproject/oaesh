
var _ = require('underscore');
var util = require('util');
var yargs = require('yargs');

var HttpError = require('../errors/http');
var ValidationError = require('../errors/validation');
var RestAPI = require('oae-rest');

var _yargs = new yargs()
    .usage('Usage: config-clear -k <key> [-k <key> ...] [--tenant=<tenant alias>]')

    .alias('t', 'tenant')
    .describe('t', 'The tenant whose configuration key(s) you wish to clear. Defaults to the current tenant')

    .describe('k', 'A configuration key to clear for the tenant. e.g., -k oae-authentication/twitter/enabled');

module.exports = {
    'description': 'Clear a tenant configuration value.',
    'help': _yargs.help(),
    'invoke': function(session, args, callback) {
        var argv = _yargs.parse(args);
        var restCtx = session.env('current').ctx;

        var keys = null;
        if (!argv.k) {
            throw new ValidationError('k', 'Must use the "k" parameter to specify at least one configuratio key to clear', _yargs.help());
        } else if (_.isArray(argv.k)) {
            keys = _.compact(argv.k);
        } else {
            keys = [argv.k];
        }

        RestAPI.Config.clearConfig(restCtx, argv.t, keys, function(err) {
            if (err) {
                throw new HttpError(err.code, err.msg);
            }

            return callback();
        });
    }
};
