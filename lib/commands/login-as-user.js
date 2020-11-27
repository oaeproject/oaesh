const url = require('url');
const util = require('util');
const yargs = require('yargs');

const HttpError = require('../errors/http');
const ValidationError = require('../errors/validation');

const ArgsUtil = require('./util/args');
const OaeshUtil = require('../util');
const RestAPI = require('oae-rest');
const { RestContext } = require('oae-rest/lib/model');

const _yargs = new yargs()
	.usage('Usage: login-as-user --user-id=<user id>')

	.alias('u', 'user-id')
	.describe('u', 'The ID of the user who you wish to authenticate as');

module.exports = {
	description: 'Log in as a specified user to their tenant.',
	help: _yargs.help(),
	invoke(session, args, callback) {
		const adminRestCtx = session.env('current').ctx;
		const argv = _yargs.parse(args);

		if (!ArgsUtil.string(argv.u)) {
			throw new ValidationError('user-id', 'Required parameter', _yargs.help());
		}

		RestAPI.Admin.getSignedBecomeUserAuthenticationRequestInfo(adminRestCtx, argv.u, function (err, requestInfo) {
			if (err) {
				throw new HttpError(err.code, err.msg);
			}

			const adminUrlParsed = url.parse(adminRestCtx.host);
			const targetUrlParsed = url.parse(requestInfo.url);

			// Create a new rest context for the target tenant, maintaining the protocol, which is mostly
			// useful for testing scenarios
			const userRestCtx = new RestContext(util.format('%s//%s', adminUrlParsed.protocol, targetUrlParsed.host), {
				hostHeader: targetUrlParsed.host,
				strictSSL: adminRestCtx.strictSSL
			});

			// Perform the actual login
			RestAPI.Admin.doSignedAuthentication(userRestCtx, requestInfo.body, function (err) {
				if (err) {
					throw new HttpError(err.code, err.msg);
				}

				OaeshUtil.switchContext(session, userRestCtx, function (err) {
					if (err) {
						throw new HttpError(err.code, err.msg);
					}

					return callback();
				});
			});
		});
	}
};
