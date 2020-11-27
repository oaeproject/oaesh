const _ = require('underscore');
const fs = require('fs');
const querystring = require('querystring');
const url = require('url');
const util = require('util');
const yargs = require('yargs');

const HttpError = require('../errors/http');
const ValidationError = require('../errors/validation');

const ArgsUtil = require('./util/args');
const OaeshUtil = require('../util');
const RestUtil = require('oae-rest/lib/util');

const _yargs = new yargs()
	.usage(
		'Usage: exec <path with query string (e.g., "/api/search/general?q=Branden Visser&limit=10")> [--method=<method>] [--data=<data>] [--file=<file>]'
	)

	.alias('m', 'method')
	.describe('m', 'The request method (e.g., GET, DELETE, POST)')

	.alias('d', 'data')
	.describe(
		'd',
		'A key-value pair separated by \'=\' representing a request body parameter (e.g. -d "displayName=Mathieu Decoene")'
	)

	.alias('F', 'file')
	.describe(
		'F',
		'A key-value pair separated by \'=\' indicating a file path to upload (e.g., -F "file=/Users/john/Documents/life.pdf")'
	);

module.exports = {
	description: 'Perform an arbitrary HTTP request to the current tenant as the current user.',
	help: _yargs.help(),
	invoke(session, args, callback) {
		const restCtx = session.env('current').ctx;
		const argv = _yargs.parse(args);

		if (!ArgsUtil.string(argv._[0])) {
			throw new ValidationError(
				'path',
				'Must specify a request path with query string (e.g., "/api/user/import")',
				_yargs.help()
			);
		}

		let method = argv.m;
		const pathAndQuery = argv._[0];
		let data = null;

		// Check if body parameters have been specified (e.g. -d "oae-authentication/twitter/enabled=false")
		if (argv.d || argv.F) {
			if (method === 'GET') {
				throw new ValidationError('method', 'Cannot send a GET request with -d or -F data parameters', _yargs.help());
			}

			method = method || 'POST';
			data = _getRequestBodyData(argv);
		} else {
			method = method || 'GET';
		}

		RestUtil.RestRequest(restCtx, pathAndQuery, method, data, function (err, body, response) {
			if (err) {
				throw new HttpError(err.code, err.msg);
			}

			if (_.isString(body)) {
				console.log(body);
			} else {
				console.log(JSON.stringify(body, null, 2));
			}

			return callback();
		});
	}
};

function _getRequestBodyData(argv) {
	const argvData = OaeshUtil.getArrayArg(argv.d);
	const argvFile = OaeshUtil.getArrayArg(argv.F);
	const data = {};

	// Bind the --data parameters to the data object
	_.chain(argvData)
		.map(function (keyValueString) {
			const parameter = OaeshUtil.parseKeyValue(keyValueString);
			if (!parameter) {
				throw new ValidationError('data', util.format('Invalid key-value pair: "%s"', keyValueString), _yargs.help());
			}

			return parameter;
		})

		// Merge all the key-value pairs into an object over top of the data object
		.merge(data);

	// Bind the --file parameters to the data object
	_.chain(argvFile)
		.map(function (keyValueString) {
			const parameter = OaeshUtil.parseKeyValue(keyValueString);
			if (!parameter) {
				throw new ValidationError('file', util.format('Invalid key-value pair: "%s"', keyValueString), _yargs.help());
			}

			const path = _.chain(parameter).values().first().value();
			if (!fs.existsSync(path)) {
				throw new ValidationError('file', util.format('File "%s" does not exist', path));
			}

			return parameter;
		})
		.merge()
		.transform(function (path, key) {
			return _.object([key], [_getDataFileStreamGetter(path)]);
		})
		.extendRight(data);

	return data;
}

function _getDataFileStreamGetter(path) {
	return function () {
		return fs.createReadStream(path);
	};
}
