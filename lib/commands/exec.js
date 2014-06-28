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
        .usage('Usage: exec <path with query string (e.g., "/api/search/general?q=Branden Visser&limit=10")> [--method=<method>] [--data=<data>] [--file=<file>]')

        .alias('m', 'method')
        .describe('m', 'The request method (e.g., GET, DELETE, POST)')

        .alias('d', 'data')
        .describe('d', 'A key-value pair separated by \'=\' representing a request body parameter (e.g. -d "displayName=Mathieu Decoene")')

        .alias('F', 'file')
        .describe('F', 'A key-value pair separated by \'=\' indicating a file path to upload (e.g., -F "file=/Users/john/Documents/life.pdf")');

module.exports = {
    'description': 'Perform an arbitrary HTTP request to the current tenant as the current user.',
    'help': _yargs.help(),
    'invoke': function(session, args, callback) {
        var restCtx = session.env('current').ctx;
        var argv = _yargs.parse(args);

        if (!ArgsUtil.string(argv._[0])) {
            throw new ValidationError('path', 'Must specify a request path with query string (e.g., "/api/user/import")', _yargs.help());
        }

        var method = argv.m;
        var pathAndQuery = argv._[0];
        var data = null;

        // Check if body parameters have been specified (e.g. -d "oae-authentication/twitter/enabled=false")
        if (argv.d || argv.F) {
            if (method === 'GET') {
                throw new ValidationError('method', 'Cannot send a GET request with -d or -F data parameters', _yargs.help());
            }

            method = method || 'POST';
            data = _getRequestBodyData(argv);
        } else {
            method = method || 'GET';
        }

        RestUtil.RestRequest(restCtx, pathAndQuery, method, data, function(err, body, response) {
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

function _getRequestBodyData(argv) {
    var argvData = OaeshUtil.getArrayArg(argv.d);
    var argvFile = OaeshUtil.getArrayArg(argv.F);
    var data = {};

    // Bind the --data parameters to the data object
    _.chain(argvData)
        .map(function(keyValueStr) {
            var param = OaeshUtil.parseKeyValue(keyValueStr);
            if (!param) {
                throw new ValidationError('data', util.format('Invalid key-value pair: "%s"', keyValueStr), _yargs.help());
            }
            return param;
        })

        // Merge all the key-value pairs into an object over top of the data object
        .merge(data);

    // Bind the --file parameters to the data object
    _.chain(argvFile)
        .map(function(keyValueStr) {
            var param = OaeshUtil.parseKeyValue(keyValueStr);
            if (!param) {
                throw new ValidationError('file', util.format('Invalid key-value pair: "%s"', keyValueStr), _yargs.help());
            }

            var path = _.chain(param).values().first().value();
            if (!fs.existsSync(path)) {
                throw new ValidationError('file', util.format('File "%s" does not exist', path));
            }

            return param;
        })
        .merge()
        .transform(function(path, key) {
            return _.object([key], [_getDataFileStreamGetter(path)]);
        })
        .extendRight(data);

    return data;
}

function _getDataFileStreamGetter(path) {
    return function() {
        return fs.createReadStream(path);
    };
}
