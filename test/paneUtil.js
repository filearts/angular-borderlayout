/* global describe, beforeEach, before, after, afterEach, it, expect */
/**
 * Created by scott on 16-7-1.
 */
'use strict'

describe('', function () {
	beforeEach(module('fa.directive.borderLayout'));

	var paneUtil, Region;

	beforeEach(inject(function (_paneUtil_, _Region_) {
		// The injector unwraps the underscores (_) from around the parameter names when matching
		paneUtil = _paneUtil_;
		Region = _Region_
	}));

	it('should return the correct orientation with target anchor', function () {
		expect(paneUtil.getOrientation('north')).to.equal('vertical')
		expect(paneUtil.getOrientation('south')).to.equal('vertical')
		expect(paneUtil.getOrientation('west')).to.equal('horizontal')
		expect(paneUtil.getOrientation('east')).to.equal('horizontal')
	})

	describe('scroll view style calculation', function () {

		it('should return the correct style with anchor = north and size = 50', function () {
			var style = paneUtil.getScrollViewStyle('north', 50)
			expect(style).to.eql({
				top: 0,
				right: 0,
				bottom: 'auto',
				left: 0,
				height: '50px'
			})
		})

		it('should return the correct style with anchor = south and size = 50', function () {
			var style = paneUtil.getScrollViewStyle('south', 50)
			expect(style).to.eql({
				top: 'auto',
				right: 0,
				bottom: 0,
				left: 0,
				height: '50px'
			})
		})

		it('should return the correct style with anchor = west and size = 50', function () {
			var style = paneUtil.getScrollViewStyle('west', 50)
			expect(style).to.eql({
				top: 0,
				right: 'auto',
				bottom: 0,
				left: 0,
				width: '50px'
			})
		})

		it('should return the correct style with anchor = east and size = 50', function () {
			var style = paneUtil.getScrollViewStyle('east', 50)
			expect(style).to.eql({
				top: 0,
				right: 0,
				bottom: 0,
				left: 'auto',
				width: '50px'
			})
		})

		it('should return the correct style with  size = 0', function () {
			var style = paneUtil.getScrollViewStyle('north', 0)
			expect(style).to.eql({
				top: 0,
				right: 0,
				bottom: 0,
				left: 0,
				height: 0
			})

			style = paneUtil.getScrollViewStyle('south', 0)
			expect(style).to.eql({
				top: 0,
				right: 0,
				bottom: 0,
				left: 0,
				height: 0
			})

			style = paneUtil.getScrollViewStyle('west', 0)
			expect(style).to.eql({
				top: 0,
				right: 0,
				bottom: 0,
				left: 0,
				width: 0
			})

			style = paneUtil.getScrollViewStyle('east', 0)
			expect(style).to.eql({
				top: 0,
				right: 0,
				bottom: 0,
				left: 0,
				width: 0
			})
		})

	})

	describe('handle style calculation', function () {
		it('should return the correct style with anchor = north and size = 15px', function () {
			var region = new Region(100, 100, 25, 25, 25, 25)
			expect(paneUtil.getHandleStyle('north', region, '15px')).to.eql({
				height: '15px',
				right: 0,
				left: 0,
				bottom: 0
			})
		})
		it('should return the correct style with anchor = south and size = 15px', function () {
			var region = new Region(100, 100, 25, 25, 25, 25)
			expect(paneUtil.getHandleStyle('south', region, '15px')).to.eql({
				height: '15px',
				right: 0,
				left: 0,
				top: 0
			})
		})
		it('should return the correct style with anchor = west and size = 15px', function () {
			var region = new Region(100, 100, 25, 25, 25, 25)
			expect(paneUtil.getHandleStyle('west', region, '15px')).to.eql({
				width: '15px',
				top: 0,
				bottom: 0,
				right: 0
			})
		})
		it('should return the correct style with anchor = east and size = 15px', function () {
			var region = new Region(100, 100, 25, 25, 25, 25)
			expect(paneUtil.getHandleStyle('east', region, '15px')).to.eql({
				width: '15px',
				top: 0,
				bottom: 0,
				left: 0
			})
		})
	})

	it('should be incremental of serial id', function () {
		var id = paneUtil.generateSerialId()
		expect(id).to.equal(0)
		id = paneUtil.generateSerialId()
		expect(id).to.equal(1)
	})

	it('should convert [boolean] sting to Boolean', function () {
		var boolean = paneUtil.stringToBoolean('true')
		expect(boolean).to.be.true

		boolean = paneUtil.stringToBoolean('false')
		expect(boolean).to.be.false

		boolean = paneUtil.stringToBoolean('0')
		expect(boolean).to.be.false

		boolean = paneUtil.stringToBoolean('1')
		expect(boolean).to.be.false
	})
})
