const read = require('read');
const yargs = require('yargs');

const HttpError = require('../errors/http');
const InternalError = require('../errors/internal');
const ValidationError = require('../errors/validation');

const ArgsUtil = require('./util/args');
const OaeshUtil = require('../util');
const RestAPI = require('oae-rest');

const _yargs = new yargs()
	.usage('Usage: login --username=<username> [--password=<password>]')

	.alias('u', 'username')
	.describe('u', 'The username of the user for local authentication')

	.alias('p', 'password')
	.describe(
		'p',
		'The password of the user for local authentication. If not specified, one will be requested in a silent prompt'
	);

module.exports = {
	description: 'Log in as a user in the system.',
	help: _yargs.help(),
	invoke(session, args, callback) {
		const argv = _yargs.parse(args);

		if (!ArgsUtil.string(argv.u)) {
			throw new ValidationError('username', 'Required parameter', _yargs.help());
		}

		// Prompt for the user password if it wasn't provided in the command arguments
		_getPassword(argv.p, function (err, password) {
			if (err) {
				throw err;
			} else if (!ArgsUtil.string(password)) {
				throw new InternalError('Password Error', 'No password was specified');
			}

			// Perform the authentication request. It will set a cookie in the rest context in session
			const restCtx = session.env('current').ctx;
			RestAPI.Authentication.login(restCtx, argv.u, password, function (err) {
				if (err) {
					throw new HttpError(err.code, err.msg);
				}

				// Set the new username on the context
				restCtx.username = argv.u;

				// Switch the session to this user
				OaeshUtil.switchUser(session, restCtx, function (err) {
					if (err) {
						throw new HttpError(err.code, err.msg);
					}

					return callback();
				});
			});
		});
	}
};

function _getPassword(password, callback) {
	if (password) {
		return callback(null, password);
	}

	// Get the user password silently from the console
	return read({ prompt: 'Password: ', silent: true }, callback);
}
