const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const read = require('read');

const HttpError = require('../errors/http');
const InternalError = require('../errors/internal');
const ValidationError = require('../errors/validation');

const OaeshUtil = require('../util');
const { switchUser } = OaeshUtil;

const RestAPI = require('oae-rest');
const { createTenantAdminUser, createTenantAdminUserOnTenant } = RestAPI.User;
const { login } = RestAPI.Authentication;

const R = require('ramda');
const { defaultTo, and, compose, equals, not, tail, prop, is, fromPairs, splitEvery } = R;

const notExists = not;
const isObject = is(Object);
const isString = is(String);
const isNotString = compose(not, isString);
const differs = compose(not, equals);
const getUsername = prop('-u');
const getEmail = prop('-m');
const getTenantAlias = prop('-t');
const getVisibility = prop('-v');
const getDisplayName = prop('-d');
const getPrompt = prop('-no-prompt');

/**
 * Example for a global admin:
 * node bin/oaesh.js -i -U http://admin.oae.com -u administrator -p administrator -- admin-create -t guest -u miguellaginha -m miguel.laginha@apereo.org
 *
 * Example for a tenant admin:
 * node bin/oaesh.js -i -U http://guest.oae.com -u homersimpson -p homersimpson -- admin-create -t guest -u miguellaginha -m miguel.laginha@apereo.org -no-prompt true
 */

const yaya = yargs(hideBin(process.argv))
	.usage('admin-create -u <username> -m <email> -t <tenant-alias> [-d <displayName=<username>>] [-v <visibility>]')
	.alias('u', 'username')
	.string('u')
	.describe('u', 'The username to use to login as the user')
	.alias('t', 'tenant')
	.string('t')
	.describe('t', "The tenant alias you're creating an admin for")
	.alias('m', 'email')
	.string('m')
	.describe('m', 'The email address of the user')
	.alias('d', 'display-name')
	.string('d')
	.describe('d', 'The display name of the user. Defaults to the username')
	.alias('v', 'visibility')
	.string('v')
	.describe('v', 'The visibility of the user')
	.string('no-prompt')
	.describe('no-prompt', 'This option sets the password equal to the username and skips the prompt');

module.exports = {
	description: 'Create a user in the system.',
	help: yaya.help(),
	invoke(session, args, callback) {
		const { argv } = yaya;
		const { me, ctx } = session.env('current');

		const commandArgs = compose(fromPairs, splitEvery(2), tail, prop('_'))(argv);
		const username = getUsername(commandArgs);
		const email = getEmail(commandArgs);
		const tenantAlias = getTenantAlias(commandArgs);
		const displayName = defaultTo(username, getDisplayName(commandArgs));
		const visibility = getVisibility(commandArgs);
		const noPrompt = equals('true', getPrompt(commandArgs));

		if (notExists(username)) {
			throw new ValidationError('username', 'Required parameter', yaya.help());
		} else if (notExists(email)) {
			throw new ValidationError('email', 'Required parameter', yaya.help());
		} else if (and(me.isGlobalAdmin, notExists(tenantAlias))) {
			throw new ValidationError('tenant alias', 'Required parameter', yaya.help());
		}

		setPassword(username, noPrompt, (err, password) => {
			if (err) return callback(err);

			const postCreate = (err, user) => {
				if (err) {
					throw new HttpError(err.code, err.msg);
				}

				user.username = username;
				user.password = password;
				return loginAndSwitch(user, session, callback);
			};

			if (me.isGlobalAdmin) {
				createTenantAdminUserOnTenant(
					ctx,
					tenantAlias,
					username,
					password,
					displayName,
					email,
					{ visibility },
					postCreate
				);
			} else if (me.isTenantAdmin) {
				createTenantAdminUser(ctx, username, password, displayName, email, { visibility }, postCreate);
			}
		});
	}
};

const loginAndSwitch = (user, session, callback) => {
	// Output the created user to the console
	console.log(JSON.stringify(user, null, 2));

	// If the user is currently authenticated, do not switch the session to the new user
	const isAuthenticated = isObject(session.env('current').me);
	const butNotAnonymous = not(session.env('current').me.anon);
	if (and(isAuthenticated, butNotAnonymous)) {
		return callback();
	}

	// Set the username and password on the current context
	const { username, password } = user;
	const { ctx } = session.env('current');
	ctx.username = username;
	ctx.userPassword = password;

	login(ctx, username, password, function (err) {
		if (err) {
			throw new InternalError('Error', 'The user was created successfully, however authentication failed');
		}

		switchUser(session, ctx, function (err) {
			if (err) {
				throw new InternalError('Error', 'The user was created successfully, however authentication failed');
			}

			return callback();
		});
	});
};

const setPassword = (username, noPrompt, done) => {
	let password;
	if (noPrompt) {
		password = username;

		return done(null, password);
	}

	// Get the user password silently from the console
	read({ prompt: 'Password: ', silent: true }, (err, password) => {
		if (err) {
			throw err;
		} else if (isNotString(password)) {
			throw new InternalError('Password Error', 'No password was specified');
		}

		// Confirm password typing
		read({ prompt: 'Once more: ', silent: true }, (err, passwordVerify) => {
			if (err) {
				throw err;
			} else if (isNotString(passwordVerify)) {
				throw new InternalError('Password Error', 'No password was specified');
			} else if (differs(password, passwordVerify)) {
				throw new InternalError('Password Error', 'Passwords did not match');
			}

			return done(null, password);
		});
	});
};
