
var util = require('util');
var yargs = require('yargs');

var HttpError = require('../errors/http');
var ValidationError = require('../errors/validation');

var RestAPI = require('oae-rest');

var _yargs = new yargs()
    .usage('Usage: config-get [--tenant=<tenant alias>] [<module name>]')

    .alias('t', 'tenant')
    .describe('t', 'The tenant whose configuration you wish to get. Defaults to the current tenant');


module.exports = {
    'description': 'Retrieve tenant configuration information.',
    'help': _yargs.help(),
    'invoke': function(session, args, callback) {
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
};
