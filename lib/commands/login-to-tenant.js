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
	.usage('Usage: login-to-tenant --tenant=<tenant alias>')

	.alias('t', 'tenant')
	.describe('t', 'The tenant alias to login to');

module.exports = {
	description: 'Log in as the global admin to a tenant.',
	help: _yargs.help(),
	invoke(session, args, callback) {
		const globalAdminRestCtx = session.env('current').ctx;
		const argv = _yargs.parse(args);

		if (!ArgsUtil.string(argv.t)) {
			throw new ValidationError('tenant', 'Required parameter', _yargs.help());
		}

		RestAPI.Admin.getSignedTenantAuthenticationRequestInfo(globalAdminRestCtx, argv.t, function (err, requestInfo) {
			if (err) {
				throw new HttpError(err.code, err.msg);
			}

			const adminUrlParsed = url.parse(globalAdminRestCtx.host);
			const targetUrlParsed = url.parse(requestInfo.url);

			// Create a new rest context for the target tenant, maintaining the protocol, which is mostly
			// useful for testing scenarios
			const onTenantRestCtx = new RestContext(util.format('%s//%s', adminUrlParsed.protocol, targetUrlParsed.host), {
				hostHeader: targetUrlParsed.host,
				strictSSL: globalAdminRestCtx.strictSSL
			});

			// Perform the actual login
			RestAPI.Admin.doSignedAuthentication(onTenantRestCtx, requestInfo.body, function (err) {
				if (err) {
					throw new HttpError(err.code, err.msg);
				}

				// We know it's the same user so carry forward the username
				onTenantRestCtx.username = globalAdminRestCtx.username;
				OaeshUtil.switchContext(session, onTenantRestCtx, function (err) {
					if (err) {
						throw new HttpError(err.code, err.msg);
					}

					return callback();
				});
			});
		});
	}
};
