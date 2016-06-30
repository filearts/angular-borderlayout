/* global describe, beforeEach, before, after, afterEach, it */
'use strict'

describe('Region', function () {
	beforeEach(module('fa.directive.borderLayout'));

	var Region;

	beforeEach(inject(function (_Region_) {
		// The injector unwraps the underscores (_) from around the parameter names when matching
		Region = _Region_;
	}));

	it('should output the proper string', function() {
	    var region = createSampleRegion()
		expect(region.toString()).to.equal('{100, 100, 100, 100}, {100, 100}')
	})

	it('should clone the region', function () {
		var region = createSampleRegion()
		var cloneRegion = region.clone()
		expect(cloneRegion).to.eql(region)
	})


	function createSampleRegion() {
		return new Region(100, 100, 100, 100, 100, 100)
	}
})
