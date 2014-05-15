var _ = require('underscore');
var querystring = require('querystring');
var url = require('url');
var util = require('util');
var yargs = require('yargs');

var HttpError = require('../errors/http');
var ValidationError = require('../errors/validation');

var ArgsUtil = require('./util/args');
var RestUtil = require('oae-rest/lib/util');

var _yargs = new yargs()
        .usage('Usage: exec <path with query string (e.g., "/api/search/general?q=Branden")> [--method=<method>]')

        .alias('m', 'method')
        .describe('m', 'The request method (e.g., GET, DELETE, POST)')
        .default('m', 'GET');

module.exports = {
    'description': 'Perform an arbitrary HTTP request to the current tenant as the current user.',
    'help': _yargs.help(),
    'invoke': function(session, args, callback) {
        var restCtx = session.env('current').ctx;
        var argv = _yargs.parse(args);

        if (!ArgsUtil.string(argv._[0])) {
            throw new ValidationError('path', 'Must specify a request path with query string (e.g., "/api/search/general?q=Branden")', _yargs.help());
        }

        //restCtx, url, method, data, callback

        var parsed = null;
        try {
            parsed = url.parse(argv._[0]);
        } catch (ex) {
            throw new ValidationError('path', 'Provided path failed to be parsed as a URL', ex.stack);
        }

        var data = querystring.parse(parsed.query);
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