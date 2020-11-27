const _ = require('underscore');
const url = require('url');
const util = require('util');

const RestAPI = require('oae-rest');

/**
 * Given an arbitrary argument, ensure it is an array
 *
 * @param   {Object}    arg     An argument of arbitrary type
 * @return  {Array}             Either the arg itself if it's an array, or the argument value
 *                              wrapped in an array
 */
const getArrayArg = (module.exports.getArrayArg = function (arg) {
	if (!arg) {
		return arg;
	}

	if (_.isArray(arg)) {
		return arg;
	}

	return [arg];
});

/**
 * Parse the key value argument which should be in the format "key=value". If it is not in that
 * format (i.e., there is no "="), then `false` will be returned instead
 *
 * @param   {String}          keyValueStr   A string of the format "key=value" to parse
 * @return  {Object|Boolean}                An object representation of the key and value. Will
 *                                          return `false` if it is not a valid format
 */
const parseKeyValue = (module.exports.parseKeyValue = function (keyValueString) {
	const keyValueSplit = keyValueString.split('=');
	if (keyValueSplit.length < 2) {
		return false;
	}

	const keyValue = {};
	const key = keyValueSplit.shift();
	const value = keyValueSplit.join('=');
	keyValue[key] = value;
	return keyValue;
});

/**
 * Switch the current context to that represented by the given rest context
 *
 * @param   {Session}       session         The current corporal session
 * @param   {RestContext}   restCtx         The current rest context
 * @param   {Function}      callback        Invoked when the context has been switched
 * @param   {Error}         callback.err    An error that occurred, if any
 */
const switchContext = (module.exports.switchContext = function (session, restCtx, callback) {
	const host = restCtx.hostHeader || url.parse(restCtx.host).host;

	// Get the latest information about the tenant
	RestAPI.Tenants.getTenant(restCtx, null, function (err, tenant) {
		if (err) {
			return callback(err);
		}

		switchUser(session, restCtx, function (err) {
			if (err) {
				return callback(err);
			}

			// Ensure the global contexts cache is set to this context
			session.env('ctxs')[host] = restCtx;
			session.env('current').ctx = restCtx;
			session.env('current').tenant = tenant;

			_setCommandContext(session);

			return callback();
		});
	});
});

/**
 * Switch the user in the session context to the one who is authenticated to the given RestContext
 *
 * @param   {Session}       session         The current corporal session
 * @param   {RestContext}   restCtx         The current rest context
 * @param   {Function}      callback        Standard callback function
 * @param   {Error}         callback.err    Object containing the error code and the error message
 */
var switchUser = (module.exports.switchUser = function (session, restCtx, callback) {
	RestAPI.User.getMe(restCtx, function (err, me) {
		if (err) {
			return callback(err);
		}

		// Resolve the current username as either 'Anonymous' if anonymous, the username of the
		// authenticated user if found, otherwise the displayName of the user in quotes
		let username = me.anon === true ? 'Anonymous' : restCtx.username;
		username = username || util.format('"%s"', me.displayName);

		session.env('current').me = me;
		session.env('username', username);

		_setCommandContext(session);

		return callback();
	});
});

function _setCommandContext(session) {
	const { tenant } = session.env('current');
	const { me } = session.env('current');

	if (!tenant) {
		session.commands().ctx('');
	} else if (tenant.isGlobalAdminServer) {
		if (me.isGlobalAdmin) {
			session.commands().ctx('global-admin');
		} else {
			session.commands().ctx('global-anon');
		}
	} else if (me.isGlobalAdmin || me.isTenantAdmin) {
		session.commands().ctx('user-admin');
	} else if (me.anon) {
		session.commands().ctx('user-anon');
	} else {
		session.commands().ctx('user-user');
	}
}
