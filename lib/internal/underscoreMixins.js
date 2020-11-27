const _ = require('underscore');

_.mixin({
	/**
	 * Merge an array of objects into a single (optional) destination object.
	 */
	merge(arrayOfObjects, destination) {
		const result = destination || {};
		_.each(arrayOfObjects, function (object) {
			// Extend each object in the array over the result
			_.extend(result, object);
		});
		return result;
	},

	/**
	 * Opposite of `extend`, where `extend` starts from the right-most object parameter and extends
	 * toward the left, this starts from the left and extends toward the right.
	 */
	extendRight(/* source*, destination */) {
		return _.merge(_.initial(arguments), _.last(arguments));
	},

	/**
	 * Transform each key-value pair of an object and return a new object with all the key-value
	 * transformations. This can be thought of as a `map` for objects.
	 */
	transform(object, iterator) {
		const result = {};
		_.each(object, function (value, key) {
			// Simply apply the key-value result of the iterator to our transformed result object
			_.extend(result, iterator(value, key));
		});
		return result;
	}
});
