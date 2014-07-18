var _ = require('underscore');
var yargs = require('yargs');

var HttpError = require('../errors/http');
var InternalError = require('../errors/internal');
var ValidationError = require('../errors/validation');

var ArgsUtil = require('./util/args');
var OaeshUtil = require('../util');
var RestAPI = require('oae-rest');

var _yargs = new yargs()
    .usage('content-get-members <content id> [-l <limit>] [-s <start>]')

    .alias('l', 'limit')
    .describe('l', 'The maximum number of members to get')

    .alias('s', 'start')
    .string('s')
    .describe('s', 'Where in the list to start returning members');

module.exports = {
    'description': 'Get a list of content members.',
    'help': _yargs.help(),
    'invoke': function(session, args, callback) {
        var restCtx = session.env('current').ctx;
        var argv = _yargs.parse(args);
        var contentId = ArgsUtil.string(argv._[0]);
        var limit = ArgsUtil.number(argv.l, 12);
        var start = ArgsUtil.string(argv.s);

        if (!contentId) {
            throw new ValidationError('contentId', 'Required content id as the first parameter', _yargs.help());
        }

        RestAPI.Content.getMembers(restCtx, contentId, start, limit, function(err, result) {
            if (err) {
                throw new HttpError(err.code, err.msg);
            }

            console.log(JSON.stringify(result, null, 2));
            return callback();
        });
    }
};
