/* global describe, beforeEach, before, after, afterEach, it */
'use strict'

describe('Region', function () {
	beforeEach(module('fa.directive.borderLayout'));

	var Region;

	beforeEach(inject(function (_Region_) {
		// The injector unwraps the underscores (_) from around the parameter names when matching
		Region = _Region_;
	}));

	it('should output the proper string', function () {
		var region = createSampleRegion()
		expect(region.toString()).to.equal('{25, 25, 25, 25}, {100, 100}')
	})

	it('should clone the region', function () {
		var region = createSampleRegion()
		var cloneRegion = region.clone()
		expect(cloneRegion).to.eql(region)
	})

	it('should calculate the correct inner region', function () {
		var region = createSampleRegion()
		var innerRegion = region.getInnerRegion()
		expect(innerRegion).to.eql(new Region(50, 50, 0, 0, 0, 0))

		region = new Region(200, 150, 25, 55, 25, 55)
		innerRegion = region.getInnerRegion()
		expect(innerRegion).to.eql(new Region(90, 100, 0, 0, 0, 0))
	})

	it('should get the correct size of target orientation', function () {
		var region = createSampleRegion()
		var size = region.getSize('vertical')
		expect(size).to.equal(100)
		size = region.getSize('horizontal')
		expect(size).to.equal(100)

		region = new Region(500, 400, 25, 25, 25, 25)
		size = region.getSize('vertical')
		expect(size).to.equal(400)

		size = region.getSize('horizontal')
		expect(size).to.equal(500)
	})

	it('should get the correct size of target orientation of inner region', function () {
		var region = createSampleRegion()
		var size = region.getAvailableSize('vertical')
		expect(size).to.equal(50)
		size = region.getAvailableSize('horizontal')
		expect(size).to.equal(50)

		region = new Region(200, 150, 25, 55, 25, 55)
		size = region.getAvailableSize('vertical')
		expect(size).to.equal(100)

		size = region.getAvailableSize('horizontal')
		expect(size).to.equal(90)
	})

	describe('test Region\'s calculateSize', function () {

		it('should return 0 if target <= 0 || target == null', function () {
			var region = createSampleRegion()
			var size = region.calculateSize('vertical')
			expect(size).to.equal(0)

			size = region.calculateSize('vertical', null)
			expect(size).to.equal(0)

			size = region.calculateSize('vertical', 0)
			expect(size).to.equal(0)

			size = region.calculateSize('vertical', -1)
			expect(size).to.equal(0)
		})

		it('should return round number if target > 1', function () {
			var region = createSampleRegion()
			var size = region.calculateSize('vertical', 1)
			expect(size).to.equal(1)

			size = region.calculateSize('vertical', 2.4)
			expect(size).to.equal(Math.round(2.4))
		})


		it('should return 50 if target = 0.5 with sample region', function () {
			var region = createSampleRegion()
			var size = region.calculateSize('vertical', 0.5)
			expect(size).to.equal(50)
		})

		it('should return 46 if target = 50% - 4px with sample region', function () {
			var region = createSampleRegion()
			var size = region.calculateSize('vertical', '50% - 4px')
			expect(size).to.equal(46)
		})

		it('should return 54 if target = 50 + 4px with sample region', function () {
			var region = createSampleRegion()
			var size = region.calculateSize('vertical', '50 + 4px')
			expect(size).to.equal(54)
		})

		it('should return 50 if target = 50px || target = 50 with sample region', function () {
			var region = createSampleRegion()
			var size = region.calculateSize('vertical', 50)
			expect(size).to.equal(50)
			size = region.calculateSize('vertical', '50px')
			expect(size).to.equal(50)
		})

		it('should return round to 270 if target = 5.4& with sample region', function () {
			var region = createSampleRegion()
			var size = region.calculateSize('vertical', '5.4&')
			expect(size).to.equal(3)
		})

		it('should return round to 5 if target = 5.4% with sample region', function () {
			var region = createSampleRegion()
			var size = region.calculateSize('vertical', '5.4%')
			expect(size).to.equal(5)
		})

		it('should throw an error with unsupported string like 50*59', function () {
			var region = createSampleRegion()

			function test() {
				region.calculateSize('vertical', '50*59')
			}

			expect(test).to.throw('Unsupported size: ' + '50*59')
		})
	})

	describe('test region\'s consume', function () {
		it('should return correct result if anchor = north and size = 20 with sample region', function () {
			var region = createSampleRegion()
			var style = region.consume('north', 20)
			expect(style).to.eql({
				top: '25px',
				right: '25px',
				bottom: 'auto',
				left: '25px',
				height: '20px',
				width: 'auto'
			})
		})

		it('should return correct result if anchor = south and size = 20 with sample region', function () {
			var region = createSampleRegion()
			var style = region.consume('south', 20)
			expect(style).to.eql({
				top: 'auto',
				right: '25px',
				bottom: '25px',
				left: '25px',
				height: '20px',
				width: 'auto'
			})
		})

		it('should return correct result if anchor = west and size = 20 with sample region', function () {
			var region = createSampleRegion()
			var style = region.consume('west', 20)
			expect(style).to.eql({
				top: '25px',
				right: 'auto',
				bottom: '25px',
				left: '25px',
				height: 'auto',
				width: '20px'
			})
		})

		it('should return correct result if anchor = east and size = 20 with sample region', function () {
			var region = createSampleRegion()
			var style = region.consume('east', 20)
			expect(style).to.eql({
				top: '25px',
				right: '25px',
				bottom: '25px',
				left: 'auto',
				height: 'auto',
				width: '20px'
			})
		})

		it('should return correct result if anchor = north and size = 0 with sample region', function () {
			var region = createSampleRegion()
			var style = region.consume('north', 0)
			expect(style).to.eql({
				top: '25px',
				right: '25px',
				bottom: 'auto',
				left: '25px',
				height: '0px',
				width: 'auto',
				display: 'none'
			})
		})
	})

	function createSampleRegion() {
		return new Region(100, 100, 25, 25, 25, 25)
	}
})
