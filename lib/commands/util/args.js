var _ = require('underscore');

var string = module.exports.string = function(str, defaultStr) {
    defaultStr = (defaultStr) ? string(defaultStr) : null;
    str = (_.isString(str)) ? str.trim() : str;
    return (_.isString(str) && !_.isEmpty(str)) ? str : defaultStr;
};

var number = module.exports.number = function(num, defaultNum) {
    defaultNum = (_.isNumber(defaultNum)) ? number(defaultNum) : null;
    return (_.isNumber(num)) ? num : defaultNum;
};
