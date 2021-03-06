const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const HttpError = require('../errors/http');
const utilities = require('../util');
const ValidationError = require('../errors/validation');

const RestAPI = require('oae-rest');
const { updateConfig } = RestAPI.Config;

const R = require('ramda');
const { tail, map, not, is, mergeRight, compose, fromPairs, splitEvery, prop } = R;

const isArray = is(Array);

/**
 * Example:
 * node bin/oaesh.js -u administrator -p administrator --insecure -U http://admin.oae.com -- config-set -k oae-principals/recaptcha/enabled=false -t guest
 */

const yaya = yargs(hideBin(process.argv))
	.usage('Usage: config-set -k "<key>=<value>" [-k "<key>=<value>"...] [--tenant=<tenant alias>]')
	.alias('t', 'tenant')
	.describe('t', 'The tenant whose configuration you wish to set. Defaults to the current tenant')
	.describe(
		'k',
		'A key-value pair specifying a configuration value to set. e.g., -k oae-authentication/twitter/enabled=false'
	);

module.exports = {
	description: 'Set a tenant configuration value.',
	help: yaya.help(),
	invoke(session, args, callback) {
		const { argv } = yaya;
		const { ctx } = session.env('current');

		const commandArgs = compose(fromPairs, splitEvery(2), tail, prop('_'))(argv);
		const setting = prop('-k', commandArgs);
		const tenantAlias = prop('-t', commandArgs);
		let keyValues = {};

		if (not(setting)) {
			throw new ValidationError(
				'k',
				'Must use the "k" parameter to specify at least one key-value pair to set',
				yaya.help()
			);
		} else if (isArray(setting)) {
			keyValues = map(compose(mergeRight(keyValues), utilities.parseKeyValue), setting);
		} else {
			keyValues = mergeRight(keyValues, utilities.parseKeyValue(setting));
		}

		updateConfig(ctx, tenantAlias, keyValues, (err) => {
			if (err) {
				throw new HttpError(err.code, err.msg);
			}

			// Display the changes that were made based on the user's input
			console.log(JSON.stringify(keyValues, null, 2));

			return callback();
		});
	}
};
