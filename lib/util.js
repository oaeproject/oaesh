var url = require('url');
var util = require('util');

var RestAPI = require('oae-rest');

var switchContext = module.exports.switchContext = function(session, restCtx, callback) {
    var host = restCtx.hostHeader || url.parse(restCtx.host).host;

    // Get the latest information about the tenant
    RestAPI.Tenants.getTenant(restCtx, null, function(err, tenant) {
        if (err) {
            return callback(err);
        }

        switchUser(session, restCtx, function(err) {
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
};

var switchUser = module.exports.switchUser = function(session, restCtx, callback) {
    RestAPI.User.getMe(restCtx, function(err, me) {
        if (err) {
            return callback(err);
        }

        // Resolve the current username as either 'Anonymous' if anonymous, the
        // username of the authenticated user if found, otherwise the displayName
        // of the user in quotes
        var username = (me.anon === true) ? 'Anonymous' : restCtx.username;
        username = username || util.format('"%s"', me.displayName);

        session.env('current').me = me;
        session.env('username', username);

        _setCommandContext(session);

        return callback();
    });
};

function _setCommandContext(session) {
    var tenant = session.env('current').tenant;
    var me = session.env('current').me;

    if (!tenant) {
        session.commands().ctx('');
    } else if (tenant.isGlobalAdminServer) {
        if (me.isGlobalAdmin) {
            session.commands().ctx('global-admin');
        } else {
            session.commands().ctx('global-anon');
        }
    } else {
        if (me.isGlobalAdmin || me.isTenantAdmin) {
            session.commands().ctx('user-admin');
        } else if (me.anon) {
            session.commands().ctx('user-anon');
        } else {
            session.commands().ctx('user-user');
        }
    }
}
