var _ = require('underscore');

var string = module.exports.string = function(str, defaultStr) {
    defaultStr = (defaultStr) ? string(defaultStr) : null;
    str = (_.isString(str)) ? str.trim() : str;
    return (_.isString(str) && !_.isEmpty(str)) ? str : defaultStr;
};
