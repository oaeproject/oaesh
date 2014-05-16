#!/usr/bin/env node

var _ = require('underscore');
var colors = require('colors');
var Corporal = require('corporal');
var path = require('path');
var sprintf = require('sprintf-js');
var util = require('util');
var yargs = require('yargs');

var HttpError = require('../lib/errors/http');
var InternalError = require('../lib/errors/internal');
var ValidationError = require('../lib/errors/validation');

var RestUtil = require('oae-rest/lib/util');

var argv = yargs
    .usage('Usage: oaesh [--insecure] [--url <target>] [--username <username>] [-- <command>]')

    .alias('h', 'help')
    .describe('h', 'Show this help dialog')

    .alias('i', 'insecure')
    .describe('i', 'Allow insecure connections to the target environment, such as a QA environment that has a self-signed SSL certificate')

    .alias('U', 'url')
    .describe('U', 'The target URL to use (e.g., https://my.oae.com)')

    .alias('u', 'username')
    .describe('u', 'The username to use to authenticate. If this is specified, -U must be specified as well')

    .argv;

if (argv.h) {
    yargs.showHelp();
    process.exit(0);
} else if (argv.u && !argv.U) {
    console.error('If a username is specified, a target URL must be specified as well');
    console.error();
    yargs.showHelp();
    process.exit(1);
}

var _initialized = false;

// /dev/null the error event, we handle them individually in the commands
RestUtil.on('error', function(err) {});



////////////////////
// INITIALIZATION //
////////////////////

var corporal = new Corporal({
    'commands': path.join(__dirname, '../lib/commands'),
    'commandContexts': {
        '*': {
            'commands': ['use']
        },
        'global-anon': {
            'commands': [
                'config-get',
                'exec',
                'login',
                'me'
            ]
        },
        'global-admin': {
            'commands': [
                'config-clear',
                'config-get',
                'config-set',
                'exec',
                'login-as-user',
                'login-to-tenant',
                'logout',
                'me',
                'previews-reprocess',
                'search-reindex-all'
            ]
        },
        'user-anon': {
            'commands': [
                'config-get',
                'exec',
                'login',
                'me',
                'user-create'
            ]
        },
        'user-admin': {
            'commands': [
                'config-clear',
                'config-get',
                'config-set',
                'exec',
                'login-as-user',
                'logout',
                'me',
                'user-create'
            ]
        },
        'user-user': {
            'commands': [
                'config-get',
                'exec',
                'logout',
                'me'
            ]
        }
    },
    'env': {
        'ps1': 'oaesh$ '.bold,
        'ps2': '> ',
        'corporal_command_settings': {
            'help': {
                'hide': ['clear', 'help', 'quit']
            }
        },
        'insecure': (argv.i)
    }
});



////////////////////
// ERROR HANDLING //
////////////////////

corporal.onCommandError(ValidationError, function(err, session, next) {
    console.error('Validation Error ('.red + err.argumentName.white + '): '.red + err.message.white);
    if (err.help) {
        console.error('');
        console.error(err.help);
    }

    if (!_initialized) {
        process.exit(1);
    }

    return next();
});

corporal.onCommandError(HttpError, function(err, session, next) {
    console.error(util.format('HTTP Error (%s): '.red, err.code) + err.message);

    if (!_initialized) {
        process.exit(1);
    }

    return next();
});

corporal.onCommandError(InternalError, function(err, session, next) {
    console.error(err.label.red + ': '.red + err.message.white);

    if (!_initialized) {
        process.exit(1);
    }

    return next();
});

corporal.onCommandError(Error, function(err, session, next) {
    console.error('An unexpected error occurred while processing this command.'.red);
    console.error(err.stack.white);

    if (!_initialized) {
        process.exit(1);
    }

    return next();
});



///////////////
// EXECUTION //
///////////////

corporal.on('load', function() {
    _initialize(function() {
        _initialized = true;

        // If the user specified the [-- <command>] option, simply invoke the command
        // and quit
        if (!_.isEmpty(argv._)) {
            var args = argv._.slice();
            var commandName = args.shift();
            return corporal.exec(commandName, args);
        }

        // The user did not specify a command, so they're just starting a session. Start
        // a command loop
        corporal.loop();
    });
});



////////////////////////
// INTERNAL FUNCTIONS //
////////////////////////

function _initialize(callback) {
    if (!argv.U) {
        return callback();
    }

    corporal.exec('use', [argv.U], function() {
        if (!argv.u) {
            return callback();
        }

        return corporal.exec('login', ['--username', argv.u], callback);
    });
}
