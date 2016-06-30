/* global describe, beforeEach, before, after, afterEach, it, expect */
'use strict'

describe('PaneManager', function () {
	beforeEach(module('fa.directive.borderLayout'));

	var paneManagerSrv;

	beforeEach(inject(function (paneManager) {
		// The injector unwraps the underscores (_) from around the parameter names when matching
		paneManagerSrv = paneManager;
	}));


	it('should set and get the pane properly', function () {
		paneManagerSrv.set('pane1', {id: 'pane-1'})
		var pane = paneManagerSrv.get('pane1')
		expect(pane.id).to.equal('pane-1')
	})

	it('should set and remove the pane properly', function () {
		paneManagerSrv.set('pane1', {id: 'pane-1'})
		var pane = paneManagerSrv.remove('pane1')
		expect(pane.id).to.be.undefined
	})
})
