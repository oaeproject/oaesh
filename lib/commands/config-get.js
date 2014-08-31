
var util = require('util');
var yargs = require('yargs');

var _ = require('underscore');

var HttpError = require('../errors/http');
var ValidationError = require('../errors/validation');

var RestAPI = require('oae-rest');

var _yargs = new yargs()
    .usage('Usage: config-get [--tenant=<tenant alias>] [<module name>]')

    .alias('t', 'tenant')
    .describe('t', 'The tenant whose configuration you wish to get. Defaults to the current tenant');

var argKeys = ['-t', '--tenant']

module.exports = {
    'description': 'Retrieve tenant configuration information.',
    'help': _yargs.help(),
    'init': function(session, callback) {
        // Seed the config keys cache for auto-complete as empty
        session.env('corporal_command_settings')['config-get'] = {'configKeys': {}};

        return callback();
    },
    'invoke': _invoke,
    'autocomplete': _autocomplete
};

/*!
 * Invoke the command with the given session and arguments
 */
function _invoke(session, args, callback) {
    var argv = _yargs.parse(args);
    var restCtx = session.env('current').ctx;

    RestAPI.Config.getTenantConfig(restCtx, argv.t, function(err, config) {
        if (err) {
            throw new HttpError(err.code, err.msg);
        }

        var moduleName = argv._[0];
        if (moduleName && !config[moduleName]) {
            throw new ValidationError('moduleName', util.format('No configuration found for module "%s"', moduleName));
        } else if (moduleName) {
            config = config[moduleName];
        }

        // Output the requested configuration to the console
        console.log(JSON.stringify(config, null, 2));

        return callback();
    });
}

/*!
 * Execute the auto-complete functionality given the current command state
 */
function _autocomplete(session, args, callback) {
    var last = args.pop();
    if (last.indexOf('-') !== 0) {
        if (args.length === 0) {
            return _autocompleteConfigKey(session, last, callback);
        } else {
            var secondLast = args.pop();
            if (!_.contains(argKeys, secondLast)) {
                return _autocompleteConfigKey(session, last, callback)
            }
        }
    }

    return callback();
}

/*!
 * Invoke the auto-complete assuming that the user is currently looking for all the module
 * names available to be accessed
 */
function _autocompleteConfigKey(session, prefix, callback) {
    _getConfigKeys(session, function(err, configKeys) {
        if (err) {
            return callback(err);
        }

        return callback(null, _.chain(configKeys)
            .filter(function(configKey) {
                return (configKey.indexOf(prefix) === 0)
            })
            .value())
    });
}

/*!
 * Get the configuration modules for auto-complete, possibly from cache
 */
function _getConfigKeys(session, callback) {
    var corporalCommandSettings = session.env('corporal_command_settings');
    var configGetSettings = corporalCommandSettings['config-get']
    var configKeysForUser = configGetSettings.configKeys[_getConfigCacheKey(session)];
    if (_.isArray(configKeysForUser)) {
        return callback(null, configKeysForUser);
    }

    // Get the config for the current tenant
    RestAPI.Config.getTenantConfig(session.env('current').ctx, null, function(err, config) {
        if (err) {
            return callback(err);
        }

        // Aggregate all the config keys into an array for this user. Since some users
        // may have different configurations points available to them, we maintain a
        // separate cache per user
        configKeysForUser = configGetSettings.configKeys[_getConfigCacheKey(session)] = _.keys(config);

        return callback(null, configKeysForUser);
    });
}

/*!
 * Get the cache key for configuration
 */
function _getConfigCacheKey(session) {
    return util.format('%s:%s', session.env('current').tenant.alias, session.env('username'));
}