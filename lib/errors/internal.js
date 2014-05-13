
var InternalError = module.exports = function(label, message) {
    this.label = label;
    this.message = message;
};