var _ = require('underscore');
var fs = require('fs');
var querystring = require('querystring');
var url = require('url');
var util = require('util');
var yargs = require('yargs');

var HttpError = require('../errors/http');
var ValidationError = require('../errors/validation');

var ArgsUtil = require('./util/args');
var OaeshUtil = require('../util');
var RestUtil = require('oae-rest/lib/util');

var _yargs = new yargs()
        .usage('Usage: exec <path with query string (e.g., "/api/user/import")> [--method=<method>] [--data=<data>] [--file=<file>]')

        .alias('m', 'method')
        .describe('m', 'The request method (e.g., GET, DELETE, POST)')
        .default('m', 'GET')

        .alias('d', 'data')
        .describe('d', 'The request body parameter (e.g. oae-authentication/twitter/enabled=false)')

        .alias('F', 'file')
        .describe('F', 'The path of the file that needs to be uploaded (e.g. /Users/john/Documents/users.csv)');

module.exports = {
    'description': 'Perform an arbitrary HTTP request to the current tenant as the current user.',
    'help': _yargs.help(),
    'invoke': function(session, args, callback) {
        var restCtx = session.env('current').ctx;
        var argv = _yargs.parse(args);

        if (!ArgsUtil.string(argv._[0])) {
            throw new ValidationError('path', 'Must specify a request path with query string (e.g., "/api/user/import")', _yargs.help());
        }

        var data = {};

        // Try parsing the given querystring parameters, if any. (e.g. ?q=Branden&limit=5)
        var parsed = null;
        try {
            parsed = url.parse(argv._[0]);
        } catch (ex) {
            throw new ValidationError('path', 'Provided path failed to be parsed as a URL', ex.stack);
        }
        data = querystring.parse(parsed.query);

        // Check if body parameters have been specified (e.g. -d "oae-authentication/twitter/enabled=false")
        if (argv.d) {
            if (_.isArray(argv.d)) {
                _.each(argv.d, function(keyValue) {
                    _.extend(data, OaeshUtil.parseKeyValue(keyValue));
                });
            } else {
                _.extend(data, OaeshUtil.parseKeyValue(argv.d));
            }
        }

        // Check if a file has been specified (e.g. )
        if (argv.F) {
            if (_.isArray(argv.F)) {
                throw new HttpError(400, util.format('Invalid file parameter; received %s, expected 1', argv.F.length));
            }
            _.extend(data, {'file': getDataFileStream(argv.F)});
        }

        RestUtil.RestRequest(restCtx, parsed.pathname, argv.m, data, function(err, body, response) {
            if (err) {
                throw new HttpError(err.code, err.msg);
            }

            if (_.isString(body)) {
                console.log(body);
            } else {
                console.log(JSON.stringify(body, null, 2));
            }

            return callback();
        });
    }
};

/**
 * Return a function that gets a stream to a file in the 'data' directory of the current test directory
 *
 * @param  {String}     filename    The name of the file in the test data directory to be loaded
 * @return {Function}               A function that, when executed without parameters, returns a stream to the file in the test data directory with the provided filename
 */
var getDataFileStream = function(file) {
    return function() {
        return fs.createReadStream(file);
    };
};
