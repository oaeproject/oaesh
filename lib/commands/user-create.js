var _ = require('underscore');
var read = require('read');
var yargs = require('yargs');

var HttpError = require('../errors/http');
var InternalError = require('../errors/internal');
var ValidationError = require('../errors/validation');

var ArgsUtil = require('./util/args');
var OaeshUtil = require('../util');
var RestAPI = require('oae-rest');

var _yargs = new yargs()
    .usage('user-create -u <username> -m <email> [-d <displayName=<username>>] [-v <visibility>]')

    .alias('u', 'username')
    .string('u')
    .describe('u', 'The username to use to login as the user')

    .alias('m', 'email')
    .string('m')
    .describe('m', 'The email address of the user')

    .alias('d', 'display-name')
    .string('d')
    .describe('d', 'The display name of the user. Defaults to the username')

    .alias('v', 'visibility')
    .string('v')
    .describe('v', 'The visibility of the user');

module.exports = {
    'description': 'Create a user in the system.',
    'help': _yargs.help(),
    'invoke': function(session, args, callback) {
        var restCtx = session.env('current').ctx;
        var argv = _yargs.parse(args);
        var username = ArgsUtil.string(argv.u);
        var email = ArgsUtil.string(argv.m);

        if (!username) {
            throw new ValidationError('username', 'Required parameter', _yargs.help());
        } else if (!email) {
            throw new ValidationError('email', 'Required parameter', _yargs.help());
        }

        // Get the user password silently from the console
        read({'prompt': 'Password: ', 'silent': true}, function(err, password) {
            if (err) {
                throw err;
            } else if (!ArgsUtil.string(password)) {
                throw new InternalError('Password Error', 'No password was specified');
            }

            // Get it again because they're probably drunk
            read({'prompt': 'Once more: ', 'silent': true}, function(err, passwordVerify) {
                if (err) {
                    throw err;
                } else if (!ArgsUtil.string(passwordVerify)) {
                    throw new InternalError('Password Error', 'No password was specified');
                } else if (password !== passwordVerify) {
                    throw new InternalError('Password Error', 'Passwords did not match');
                }

                var displayName = ArgsUtil.string(argv.d, username);
                var visibility = ArgsUtil.string(argv.v);

                RestAPI.User.createUser(restCtx, username, password, displayName, {'email': email, 'visibility': visibility}, function(err, user) {
                    if (err) {
                        throw new HttpError(err.code, err.msg);
                    }

                    // Output the created user to the console
                    console.log(JSON.stringify(user, null, 2));

                    // If the user is currently authenticated, do not switch the session to the new user
                    if (_.isObject(session.env('current').me) && !session.env('current').me.anon) {
                        return callback();
                    }

                    // Set the username and password on the current context
                    restCtx.username = username;
                    restCtx.userPassword = password;

                    RestAPI.Authentication.login(restCtx, username, password, function(err) {
                        if (err) {
                            throw new InternalError('Error', 'The user was created successfully, however authentication failed');
                        }

                        OaeshUtil.switchUser(session, restCtx, function(err) {
                            if (err) {
                                throw new InternalError('Error', 'The user was created successfully, however authentication failed');
                            }

                            return callback();
                        });
                    });
                });
            });
        });
    }
};
