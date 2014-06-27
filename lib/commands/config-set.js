
var _ = require('underscore');
var util = require('util');
var yargs = require('yargs');

var HttpError = require('../errors/http');
var OaeshUtil = require('../util');
var ValidationError = require('../errors/validation');
var RestAPI = require('oae-rest');

var _yargs = new yargs()
    .usage('Usage: config-set -k "<key>=<value>" [-k "<key>=<value>"...] [--tenant=<tenant alias>]')

    .alias('t', 'tenant')
    .describe('t', 'The tenant whose configuration you wish to set. Defaults to the current tenant')

    .describe('k', 'A key-value pair specifying a configuration value to set. e.g., -k oae-authentication/twitter/enabled=false');

module.exports = {
    'description': 'Set a tenant configuration value.',
    'help': _yargs.help(),
    'invoke': function(session, args, callback) {
        var argv = _yargs.parse(args);
        var restCtx = session.env('current').ctx;

        var keyValues = {};

        if (!argv.k) {
            throw new ValidationError('k', 'Must use the "k" parameter to specify at least one key-value pair to set', _yargs.help());
        } else if (_.isArray(argv.k)) {
            _.each(argv.k, function(keyValue) {
                _.extend(keyValues, OaeshUtil.parseKeyValue(keyValue));
            });
        } else {
            _.extend(keyValues, OaeshUtil.parseKeyValue(argv.k));
        }

        RestAPI.Config.updateConfig(restCtx, argv.t, keyValues, function(err) {
            if (err) {
                throw new HttpError(err.code, err.msg);
            }

            // Display the changes that were made based on the user's input
            console.log(JSON.stringify(keyValues, null, 2));

            return callback();
        });
    }
};
