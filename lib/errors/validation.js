
var ValidationError = module.exports = function(argumentName, message, help) {
    this.argumentName = argumentName;
    this.message = message;
    this.help = help;
};
