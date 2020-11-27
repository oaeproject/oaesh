#!/usr/bin/env node
/* eslint-disable camelcase, no-use-extend-native/no-use-extend-native */

const path = require('path');

const Corporal = require('corporal');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

const HttpError = require('../lib/errors/http');
const InternalError = require('../lib/errors/internal');
const ValidationError = require('../lib/errors/validation');

const RestUtil = require('oae-rest/lib/util');

const R = require('ramda');
const { not, isEmpty, compose } = R;
const isNotEmpty = compose(not, isEmpty);

const yaya = yargs(hideBin(process.argv))
	.usage('Usage: oaesh [--insecure] [--url <target>] [--username <username>] [-- <command>]')
	.alias('h', 'help')
	.describe('h', 'Show this help dialog')
	.alias('i', 'insecure')
	.describe(
		'i',
		'Allow insecure connections to the target environment, such as a QA environment that has a self-signed SSL certificate'
	)
	.alias('U', 'url')
	.describe('U', 'The target URL to use (e.g., https://guest.oae.com)')
	.alias('u', 'username')
	.describe('u', 'The username to use to authenticate. If this is specified, -U must be specified as well')
	.alias('p', 'password')
	.describe(
		'p',
		'The password to use to authenticate. If -u is specified without this parameter, a password prompt is used'
	);

const { argv } = yaya;

if (argv.h) {
	yargs.showHelp();
	process.exit(0);
} else if (argv.u && !argv.U) {
	console.error('If a username is specified, a target URL must be specified as well');
	console.error();
	yargs.showHelp();
	process.exit(1);
}

let _initialized = false;

// /dev/null the error event, we handle them individually in the commands
RestUtil.on('error', function (/* err */) {});

/**
 * Initialization
 */
const corporal = new Corporal({
	commands: path.join(__dirname, '../lib/commands'),
	commandContexts: {
		'*': {
			commands: ['use']
		},
		'global-anon': {
			commands: ['config-get', 'exec', 'login', 'me']
		},
		'global-admin': {
			commands: [
				'config-clear',
				'config-get',
				'config-set',
				'exec',
				'login-as-user',
				'login-to-tenant',
				'logout',
				'me',
				'user-create',
				'admin-create',
				'previews-reprocess',
				'search-reindex-all'
			]
		},
		'user-anon': {
			commands: ['config-get', 'content-get-members', 'exec', 'login', 'me', 'user-create']
		},
		'user-admin': {
			commands: [
				'config-clear',
				'config-get',
				'config-set',
				'content-get-members',
				'exec',
				'login-as-user',
				'logout',
				'me',
				'user-create',
				'admin-create'
			]
		},
		'user-user': {
			commands: ['config-get', 'content-get-members', 'exec', 'logout', 'me']
		}
	},
	env: {
		ps1: 'oaesh$ '.bold,
		ps2: '> ',
		corporal_command_settings: {
			help: {
				hide: ['clear', 'help', 'quit']
			}
		},
		insecure: argv.i
	}
});

/**
 * Error handling
 */
corporal.onCommandError(ValidationError, function (err, session, next) {
	console.error('Validation Error ('.red + err.argumentName.white + '): '.red + err.message.white);
	if (err.help) {
		// TODO log here something
	}

	if (!_initialized) {
		process.exit(1);
	}

	return next();
});

corporal.onCommandError(HttpError, function (err, session, next) {
	console.error(`HTTP Error (${err.message}): `.red, err.code);

	if (!_initialized) {
		process.exit(1);
	}

	return next();
});

corporal.onCommandError(InternalError, function (err, session, next) {
	console.error(err.label.red + ': '.red + err.message.white);

	if (!_initialized) {
		process.exit(1);
	}

	return next();
});

corporal.onCommandError(Error, function (err, session, next) {
	console.error('An unexpected error occurred while processing this command.'.red);
	console.error(err.stack.white);

	if (!_initialized) {
		process.exit(1);
	}

	return next();
});

/**
 * Execution
 */
corporal.on('load', () => {
	_initialize(() => {
		_initialized = true;

		// If the user specified the [-- <command>] option, simply invoke the command and quit
		if (isNotEmpty(argv._)) {
			const args = argv._.slice();
			const commandName = args.shift();
			return corporal.exec(commandName, args);
		}

		// The user did not specify a command, so they're just starting a session. Start a command loop
		corporal.loop();
	});
});

/**
 * Internal functions
 */
function _initialize(callback) {
	if (not(argv.U)) {
		return callback();
	}

	corporal.exec('use', [argv.U], () => {
		if (not(argv.u)) {
			return callback();
		}

		const loginArgs = ['--username', argv.u];
		if (argv.p) {
			loginArgs.push('--password', argv.p);
		}

		return corporal.exec('login', loginArgs, callback);
	});
}
