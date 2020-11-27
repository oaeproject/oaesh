const _ = require('underscore');

var string = (module.exports.string = function (string_, defaultString) {
	defaultString = defaultString ? string(defaultString) : null;
	string_ = _.isString(string_) ? string_.trim() : string_;
	return _.isString(string_) && !_.isEmpty(string_) ? string_ : defaultString;
});

var number = (module.exports.number = function (number_, defaultNumber) {
	defaultNumber = _.isNumber(defaultNumber) ? number(defaultNumber) : null;
	return _.isNumber(number_) ? number_ : defaultNumber;
});
