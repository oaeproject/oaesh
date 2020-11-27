const _ = require('underscore');
const util = require('util');
const yargs = require('yargs');

const HttpError = require('../errors/http');
const ValidationError = require('../errors/validation');

const OaeshUtil = require('../util');
const RestAPI = require('oae-rest');

module.exports = {
	description: 'Reprocess previews for filtered content and revisions.',
	help: _help(),
	invoke(session, args, callback) {
		const restCtx = session.env('current').ctx;
		const argv = yargs.parse(args);

		if (!_.isEmpty(argv._) && (argv.content || argv.revision)) {
			// The user should only provide the <content id> <revision id> OR the -f flags,
			// not both
			throw new ValidationError(
				'filter',
				'If the content ID and revision ID are provided, the filters should not be provided.',
				_help()
			);
		} else if (_.isEmpty(argv._) && !(argv.content || argv.revision)) {
			// The user should provide either the revision id or the content it
			throw new ValidationError('filter', 'One of content ID and revision ID or filters must be provided.', _help());
		} else if (!_.isEmpty(argv._) && argv._.length !== 2) {
			// When using the revision id, both the content and revision id should be used
			throw new ValidationError(
				'content and revision id',
				'If specifying a particular revision, both content and revision ID should be specified',
				_help()
			);
		}

		if (!_.isEmpty(argv._)) {
			RestAPI.Previews.reprocessPreview(restCtx, argv._[0], argv._[1], function (err) {
				if (err) {
					throw new HttpError(err.code, err.msg);
				}

				console.log('Reprocessing previews started');
				return callback();
			});
		} else {
			const filters = {};
			_.each(argv.content, function (value, key) {
				filters[util.format('content_%s', key)] = value;
			});

			_.each(argv.revision, function (value, key) {
				filters[util.format('revision_%s', key)] = value;
			});

			RestAPI.Previews.reprocessPreviews(restCtx, filters, function (err) {
				if (err) {
					throw new HttpError(err.code, err.msg);
				}

				console.log('Reprocessing previews started');
				return callback();
			});
		}
	}
};

function _help() {
	return (
		'Usage: previews-reprocess [<content id> <revision id>] | [--<filter key>=<filter value> ...]\n\n' +
		'Tells OAE to reprocess previews for content and revisions that match a provided set of filters. The\n' +
		'options for filter keys are the following:\n\n' +
		'   content.createdBy=<user id>         Filter down to revisions of content items created by this user\n' +
		'   content.resourceSubType=<type>      Filter down to content items of this resource sub-type (e.g., \n' +
		'                                       file, link, collabdoc)\n' +
		'   content.previewStatus=<status>      Filter down to content items whose latest revision preview status\n' +
		'                                       is the provided status\n' +
		'   revision.mime=<mime>                Filter down to revisions who have this mime type\n' +
		'   revision.createdAfter=<timestamp>   Filter down to revisions that were created after this date in\n' +
		'                                       millis since the epoch\n' +
		'   revision.createdBefore=<timestamp>  Filter down to revisions that were created before this date in\n' +
		'                                       millis since the epoch\n' +
		'   revision.createdBy=<user id>        Filter down to revisions that were created by this user\n\n' +
		'Examples:\n\n' +
		'Reprocess all JPG revisions:       previews-reprocess --content.resourceSubType=file --revision.mime=image/jpg\n' +
		'Reprocess a specific revision:     previews-reprocess c:cam:dfjDFJ3hf r:cam:sfjw93-_j\n'
	);
}
