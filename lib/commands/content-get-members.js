const _ = require('underscore');
const yargs = require('yargs');

const HttpError = require('../errors/http');
const InternalError = require('../errors/internal');
const ValidationError = require('../errors/validation');

const ArgsUtil = require('./util/args');
const OaeshUtil = require('../util');
const RestAPI = require('oae-rest');

const _yargs = new yargs()
	.usage('content-get-members <content id> [-l <limit>] [-s <start>]')

	.alias('l', 'limit')
	.describe('l', 'The maximum number of members to get')

	.alias('s', 'start')
	.string('s')
	.describe('s', 'Where in the list to start returning members');

module.exports = {
	description: 'Get a list of content members.',
	help: _yargs.help(),
	invoke(session, args, callback) {
		const restCtx = session.env('current').ctx;
		const argv = _yargs.parse(args);
		const contentId = ArgsUtil.string(argv._[0]);
		const limit = ArgsUtil.number(argv.l, 12);
		const start = ArgsUtil.string(argv.s);

		if (!contentId) {
			throw new ValidationError('contentId', 'Required content id as the first parameter', _yargs.help());
		}

		RestAPI.Content.getMembers(restCtx, contentId, start, limit, function (err, result) {
			if (err) {
				throw new HttpError(err.code, err.msg);
			}

			console.log(JSON.stringify(result, null, 2));
			return callback();
		});
	}
};
