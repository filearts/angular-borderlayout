/* global define */
(function (root, factory) {

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['angular'], factory);
	} else if (typeof module === 'object' && module.exports) {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports, like Node.
		// to support bundler like browserify
		module.exports = factory(require('angular'));
	} else {
		// Browser globals (root is window)
		return factory(root.angular);
	}

}(window, function (angular) {

	'use strict'

	const paneUtil = {
		/**
		 * orientation based on borderlayout
		 *
		 * @param {string} anchor
		 * @returns {*}
		 */
		getOrientation(anchor) {
			switch (anchor) {
				case 'north':
				case 'south':
					return 'vertical';
				case 'east':
				case 'west':
					return 'horizontal';
			}
		},

		/**
		 * the basic position and size style of the scroll view
		 *
		 * @param {string} anchor
		 * @param {number} size
		 * @returns {{top: number, right: number, bottom: number, left: number}}
		 */
		getScrollViewStyle: function (anchor, size) {
			let style = {
				top: 0,
				right: 0,
				bottom: 0,
				left: 0
			};

			if (size) {
				switch (anchor) {
					case 'north':
						style.bottom = 'auto';
						style.height = `${size}px`;
						break;
					case 'east':
						style.left = 'auto';
						style.width = `${size}px`;
						break;
					case 'south':
						style.top = 'auto';
						style.height = `${size}px`;
						break;
					case 'west':
						style.right = 'auto';
						style.width = `${size}px`;
						break;
				}
			} else {
				switch (anchor) {
					case 'north':
					case 'south':
						style.height = 0;
						break;
					case 'west':
					case 'east':
						style.width = 0;
						break;
				}
			}

			return style;
		},

		/**
		 * the style of handle which may control the scroll view size
		 *
		 * @param {string} anchor
		 * @param {Region} region
		 * @param {string|number} handleSize
		 * @returns {*}
		 */
		getHandleStyle: function (anchor, region, handleSize) {
			switch (anchor) {
				case 'north':
					return {
						height: region.calculateSize('vertical', handleSize) + 'px',
						right: 0,
						left: 0,
						bottom: 0
					};
				case 'south':
					return {
						height: region.calculateSize('vertical', handleSize) + 'px',
						right: 0,
						left: 0,
						top: 0
					};
				case 'east':
					return {
						width: region.calculateSize('horizontal', handleSize) + 'px',
						top: 0,
						bottom: 0,
						left: 0
					};
				case 'west':
					return {
						width: region.calculateSize('horizontal', handleSize) + 'px',
						top: 0,
						bottom: 0,
						right: 0
					};
			}
		},

		generateSerialId: (function () {
			let counter = 0;

			const fun = function () {
				return counter++;
			};

			fun.peek = function () {
				return counter;
			};

			return fun;
		})(),

		/**
		 * convert [boolean] sting to Boolean
		 *
		 * @param {string} str
		 * @returns {boolean}
		 */
		stringToBoolean: function (str) {
			let res = str
			if (angular.isString(str)) {
				res = angular.lowercase(str) === 'true';
			}

			return !!res
		}
	}

	/**
	 * @class Region
	 * region represents a rectangle container, could be any block dom element(assuming)
	 *
	 * @param {Number} width
	 * @param {Number} height
	 * @param {Number} [top]
	 * @param {Number} [right]
	 * @param {Number} [bottom]
	 * @param {Number} [left]
	 * @constructor
	 */
	function Region(width, height, top, right, bottom, left) {
		this.width = width != null ? width : 0;
		this.height = height != null ? height : 0;
		this.top = top != null ? top : 0;
		this.right = right != null ? right : 0;
		this.bottom = bottom != null ? bottom : 0;
		this.left = left != null ? left : 0;
	}

	Region.prototype.constructor = Region

	angular.extend(Region.prototype, {
		clone() {
			return new Region(this.width, this.height, this.top, this.right, this.bottom, this.left);
		},

		/**
		 * put in string like 'vertical' or 'horizontal' as orientation and
		 * strings like '50% - 4px' or '1.3&' as the target to interpret.
		 *
		 * @param {String} orientation
		 * @param {String|Number} target
		 * @returns {Number}
		 */
		calculateSize(orientation, target) {
			let matches, terms;

			if (!target) {
				target = 0;
			}

			// the orientation size of the region
			const total = this.getSize(orientation);

			if (angular.isNumber(target)) {
				if (target >= 1) {
					return Math.round(target);
				}
				// target -> (0,1)
				if (target > 0) {
					return Math.round(target * total);
				}
				return 0;
			}

			const available = this.getAvailableSize(orientation);

			// Kill whitespace
			target = target.replace(/\s+/mg, '');

			// Allow for complex sizes, calculate them recursively
			// e.g.: 50% - 4px
			if ((terms = target.split('-')).length > 1) {
				// todo: there is something logically wrong like '52px-62px-56px+65px', it can't cal-it correctly
				return this.calculateSize(orientation, terms.shift()) - this.calculateSize(orientation, terms.join('+'));
			}

			// interpret string like '52+62px'
			if ((terms = target.split('+')).length > 1) {
				return this.calculateSize(orientation, terms.shift()) + this.calculateSize(orientation, terms.join('+'));
			}

			// strings like '56px'
			if (matches = target.match(/^(\d+)(?:px)?$/)) {
				return parseInt(matches[1], 10);
			}

			// strings like '10.2&' mean multiple to the available size in percentage
			if (matches = target.match(/^(\d+(?:\.\d+)?)&$/)) {
				return Math.round(available * parseFloat(matches[1]) / 100);
			}

			// '10%' multiple the total size in percentage
			if (matches = target.match(/^(\d+(?:\.\d+)?)%$/)) {
				return Math.round(total * parseFloat(matches[1]) / 100);
			}

			throw new Error('Unsupported size: ' + target);
		},

		/**
		 * adjust the region size based on anchor
		 *
		 * @param {string} anchor
		 * @param {number} size
		 * @returns {*}
		 */
		consume(anchor, size) {
			let style;

			if (!size) {
				size = 0;
			}

			switch (anchor) {
				case 'north':
					style = {
						top: `${this.top}px`,
						right: `${this.right}px`,
						bottom: 'auto',
						left: `${this.left}px`,
						height: `${size}px`,
						width: 'auto'
					};
					this.top += size;
					break;
				case 'east':
					style = {
						top: `${this.top}px`,
						right: `${this.right}px`,
						bottom: `${this.bottom}px`,
						left: 'auto',
						width: `${size}px`,
						height: 'auto'
					};
					this.right += size;
					break;
				case 'south':
					style = {
						top: 'auto',
						right: `${this.right}px`,
						bottom: `${this.bottom}px`,
						left: `${this.left}px`,
						height: `${size}px`,
						width: 'auto'
					};
					this.bottom += size;
					break;
				case 'west':
					style = {
						top: `${this.top}px`,
						right: 'auto',
						bottom: `${this.bottom}px`,
						left: `${this.left}px`,
						width: `${size}px`,
						height: 'auto'
					};
					this.left += size;
					break;
			}

			if (size === 0) {
				style.display = 'none';
			}

			return style;
		},

		/**
		 * calculate the inner region without position values
		 * @returns {Region}
		 */
		getInnerRegion() {
			return new Region(this.width - this.right - this.left, this.height - this.top - this.bottom);
		},

		/**
		 * Get the region's size on target orientation
		 *
		 * @param orientation
		 * @returns {number|*}
		 */
		getSize(orientation) {
			switch (orientation) {
				case 'vertical':
					return this.height;
				case 'horizontal':
					return this.width;
			}
		},

		/**
		 * calculate the available size ot target orientation
		 *
		 * todo: this method is the same as innerRegion.getSize, it may make the getInnerRegion as a property
		 * @param orientation
		 * @returns {number}
		 */
		getAvailableSize(orientation) {
			switch (orientation) {
				case 'vertical':
					return this.height - this.top - this.bottom;
				case 'horizontal':
					return this.width - this.right - this.left;
			}
		},

		toString() {
			return `{${this.top}, ${this.right}, ${this.bottom}, ${this.left}}, {${this.width}, ${this.height}}`;
		}
	})

	/**
	 * @class PaneController
	 *
	 * @property children
	 * @property closed
	 * @property noToggle
	 * @property noResize
	 * @property max
	 * @property min
	 * @property order
	 * @property handleSizeOpen
	 * @property handleSizeClosed
	 * @property parent
	 *
	 * @property $containerEl
	 * @property $handleEl
	 * @property $scrollViewEl
	 * @property $overlayEl
	 *
	 * @ngInject
	 */
	function PaneController($scope, $timeout) {
		this._$scope = $scope
		this._$timeout = $timeout
		this.children = []
		this.closed = false
		this.noToggle = false
		this.noResize = false
		this.max = Number.MAX_VALUE
		this.min = 0
		this.order = 0
	}

	PaneController.prototype.constructor = PaneController

	angular.extend(PaneController.prototype, {
		getOptions() {
			return {
				anchor: this.anchor,
				targetSize: this.targetSize,
				size: this.size,
				min: this.min,
				max: this.max,
				order: this.order || 0,
				handle: {
					open: this.handleSizeOpen || 0,
					closed: this.handleSizeClosed || 0
				},
				noResize: !!this.noResize,
				noToggle: !!this.noToggle,
				closed: this.closed
			};
		},

		setOptions(options) {
			if (options == null) {
				options = {};
			}
			if (options.anchor != null) {
				this.setAnchor(options.anchor);
			}
			if (options.size != null) {
				this.setTargetSize(options.size);
			}
			if (options.min != null) {
				this.setMinSize(options.min);
			}
			if (options.max != null) {
				this.setMaxSize(options.max);
			}
			if (options.handle != null) {
				this.setHandleSize(options.handle);
			}
			if (options.order != null) {
				this.setOrder(options.order);
			}
			if (options.noToggle != null) {
				this.setNoToggle(options.noToggle);
			}
			if (options.noResize != null) {
				this.setNoResize(options.noResize);
			}
			if (options.closed != null) {
				this.toggle(!options.closed);
			}
		},

		setAnchor(anchor) {
			this.anchor = anchor;

			this.$scheduleReflow();
		},

		setTargetSize(targetSize) {
			this.targetSize = targetSize;

			this.$scheduleReflow();
		},

		setMinSize(min) {
			this.min = min != null ? min : 0;

			this.$scheduleReflow();
		},

		setMaxSize(max) {
			this.max = max != null ? max : Number.MAX_VALUE;

			this.$scheduleReflow();
		},

		setOrder(order) {
			this.order = order || 0;

			this.$scheduleReflow();
		},

		setNoToggle(noToggle) {
			this.noToggle = !!noToggle;

			this.$scheduleReflow();
		},

		setNoResize(noResize) {
			this.noResize = !!noResize;
		},

		setHandleSize(handleSize) {
			if (angular.isObject(handleSize)) {
				if (handleSize.open && handleSize.close) {
					this.handleSizeOpen = parseInt(handleSize.open, 10) || 0;
					this.handleSizeClosed = parseInt(handleSize.close, 10) || 0;
				} else {
					throw new Error('illegal handle object.')
				}
			} else {
				this.handleSizeOpen = this.handleSizeClosed = parseInt(handleSize, 10) || 0;
			}

			this.$scheduleReflow();
		},

		// Schedule a re-flow later in the digest cycle, but do not reflow
		// more than necessary
		$scheduleReflow() {
			if (this.parent) {
				this.parent.$scheduleReflow();
			} else if (!this.$reflowScheduled) {
				this.$reflowScheduled = true;
				let $pane = this;
				this._$scope.$evalAsync(function () {
					if ($pane.$reflowScheduled) {
						$pane.reflow();
					}

					$pane.$reflowScheduled = false;
				});
			}
		},

		$onStartResize() {
			this.$containerEl.addClass('fa-pane-resizing');
		},

		$onStopResize() {
			this.$containerEl.removeClass('fa-pane-resizing');
		},

		addChild(child) {
			child.parent = this;
			this.children.push(child);

			if (this.children.length) {
				this.$containerEl.addClass('fa-pane-parent');
			}
		},

		getOrientation() {
			return paneUtil.getOrientation(this.anchor);
		},

		onHandleDown() {
			this.$containerEl.addClass('active');
		},

		onHandleUp() {
			this.$containerEl.removeClass('active');

			this.$scheduleReflow();
		},

		removeChild(child) {
			const index = this.children.indexOf(child);

			if (index > -1) {
				this.children.splice(index, 1);
			}

			if (!this.children.length) {
				this.$containerEl.removeClass('fa-pane-parent');
			}

			this.$scheduleReflow();
		},

		reflow(region) {
			const width = this.$containerEl[0].offsetWidth;
			const height = this.$containerEl[0].offsetHeight;

			region || (region = new Region(width, height));

			const anchor = this.anchor;
			if (anchor === 'north' || anchor === 'east' || anchor === 'south' || anchor === 'west') {

				this.$containerEl.removeClass('fa-pane-orientation-vertical');
				this.$containerEl.removeClass('fa-pane-orientation-horizontal');

				const orientation = paneUtil.getOrientation(this.anchor);

				this.$containerEl.addClass('fa-pane-orientation-' + orientation);
				this.anchor && this.$containerEl.addClass('fa-pane-direction-' + this.anchor);

				const handleSize = region.calculateSize(orientation, !this.closed &&
					this.handleSizeOpen || this.handleSizeClosed);

				let size = handleSize;
				if (!this.closed) {
					size = region.calculateSize(orientation, !this.closed && this.targetSize || handleSize);

					this.maxSize = this.max === Number.MAX_VALUE ?
						region.getSize(paneUtil.getOrientation(this.anchor)) : region.calculateSize(orientation, this.max);
					this.minSize = region.calculateSize(orientation, this.min);

					size = Math.min(size, this.maxSize);
					size = Math.max(size, this.minSize);
					size = Math.min(size, region.getAvailableSize(orientation));
					size = Math.max(size, handleSize);
				}

				this.size = size;

				const styleContainer = region.consume(this.anchor, size);
				const styleScrollView = paneUtil.getScrollViewStyle(this.anchor, size - handleSize);
				const styleHandle = paneUtil.getHandleStyle(this.anchor, region, handleSize);

				this.$containerEl.attr('style', '').css(styleContainer);
				this.$overlayEl.attr('style', '').css(styleScrollView);
				this.$handleEl.attr('style', '').css(styleHandle);
				this.$scrollViewEl.attr('style', '').css(styleScrollView);

			} else {
				this.$containerEl.css({
					top: `${region.top}px`,
					right: `${region.right}px`,
					bottom: `${region.bottom}px`,
					left: `${region.left}px`,
					width: 'auto',
					height: 'auto'
				});
			}

			this.$region = region.clone();
			this.reflowChildren(this.$region.getInnerRegion());

			if (this._promise !== null) {
				this._$timeout.cancel(this._promise);
			}

			this._promise = this._$timeout(function () {
				this._$scope.$emit('fa-pane-reflow-finished', this);
				this._$scope.$broadcast('fa-pane-reflow-finished', this);
				this._promise = null;
			}.bind(this), 400);

			this._$scope.$broadcast('fa-pane-resize', this);
		},

		reflowChildren(region) {
			if (this.children.length) {

				region || (region = this.$region);

				this.children.sort(function (a, b) {
					return a.order - b.order;
				});

				for (let i = 0; i < this.children.length; i++) {
					const child = this.children[i];
					child.reflow(region);
				}
			}
		},

		resize(targetSize) {
			if (targetSize == null) {
				targetSize = this.targetSize;
			}

			if (targetSize === this.size) return;

			this.targetSize = targetSize;

			if (targetSize > this.maxSize) {
				this.$containerEl.addClass('fa-pane-constrained');
				if (this.maxSize === this.size) {
					return;
				}
			} else if (targetSize < this.minSize) {
				this.$containerEl.addClass('fa-pane-constrained');
				if (this.minSize === this.size) {
					return;
				}
			} else {
				this.$containerEl.removeClass('fa-pane-constrained');
			}

			this.parent.reflowChildren(this.parent.$region.getInnerRegion());
		},

		toggle(open) {

			if (open == null) {
				open = !!this.closed;
			}

			this.closed = !open;

			if (this.closed) {
				this.$containerEl.addClass('fa-pane-closed');
			} else {
				this.$containerEl.removeClass('fa-pane-closed');
			}

			this.$scheduleReflow();
		}
	})

	const directiveName = 'faPane'

	const ngModule = angular.module('fa.directive.borderLayout', [])

	ngModule.factory('paneManager', function () {
		const panes = {}
		return {
			get: function (paneId) {
				return panes[paneId];
			},
			set: function (paneId, pane) {
				return panes[paneId] = pane;
			},
			remove: function (paneId) {
				return delete panes[paneId];
			}
		};
	})

	ngModule.factory('Region', function () {
		return Region;
	})

	ngModule.factory('paneUtil', function () {
		return paneUtil
	})

	ngModule.directive(directiveName, /*@ngInject*/function ($window, $templateCache, paneManager, paneUtil) {

		return {
			restrict: 'A',
			replace: true,
			require: directiveName,
			priority: 1,
			transclude: 'element',
			scope: {
				anchor: '@paneAnchor',
				paneId: `@${directiveName}`,
				size: '@paneSize',
				min: '@paneMin',
				max: '@paneMax',
				handle: '@paneHandle',
				closed: '=paneClosed',
				order: '@paneOrder',
				noResize: '@paneNoResize',
				noToggle: '@paneNoToggle'
			},
			template: $templateCache.get('template/borderLayout.tpl.html'),
			controllerAs: '$pane',
			controller: PaneController,
			link: function postlink(scope, element, attr, paneCtrl, transcludeFn) {
				// Tool used to force elements into their compile order
				const serialId = paneUtil.generateSerialId();

				if (paneCtrl.order == null) {
					paneCtrl.order = serialId;
				}

				paneCtrl.id = attr[directiveName];

				/*
				 * scope watchers
				 */
				scope.$watch('anchor', function (anchor) {
					if (anchor === undefined) return;
					paneCtrl.setAnchor(anchor);
				});

				scope.$watch('size', function (targetSize) {
					//if (targetSize === undefined)return;
					paneCtrl.setTargetSize(targetSize);
				});

				scope.$watch('closed', function (closed) {
					if (closed === undefined) return;
					paneCtrl.toggle(!closed);
				});

				scope.$watch('min', function (min) {
					if (min === undefined) return;
					paneCtrl.setMinSize(min);
				});

				scope.$watch('max', function (max) {
					if (max === undefined) return;
					paneCtrl.setMaxSize(max);
				});

				scope.$watch('order', function (order) {
					if (order === undefined) return;
					paneCtrl.setOrder(order);
				});

				scope.$watch('noResize', function (noResize) {
					if (noResize === undefined) return;
					paneCtrl.setNoResize(paneUtil.stringToBoolean(noResize));
				});

				scope.$watch('noToggle', function (noToggle) {
					if (noToggle === undefined) return;
					paneCtrl.setNoToggle(paneUtil.stringToBoolean(noToggle));
				});

				scope.$watch('paneId', function (paneId, prevPaneId) {
					if (prevPaneId) {
						paneManager.remove(prevPaneId);
						paneCtrl.$containerEl.removeClass('pane-' + prevPaneId)
					}

					paneManager.set(paneId, paneCtrl);
					paneCtrl.id = paneId;
					paneCtrl.$containerEl.addClass('pane-' + paneCtrl.id)
				});

				scope.$watch('handle', function (handle) {
					if (handle === undefined) return;
					paneCtrl.setHandleSize(scope.$eval(handle));
				});

				/*
				 * window listener
				 */
				$window.addEventListener('resize', handleWindowResize);

				function handleWindowResize(e) {
					e.stopPropagation();
					paneCtrl.$scheduleReflow();
				}

				/*
				 * transclude function
				 */
				transcludeFn(function (clone, $transcludeScope) {
					clone.addClass('fa-pane-scroll-view');
					element.append(clone);

					paneCtrl.$containerEl = element;
					paneCtrl.$overlayEl = element.children().eq(0);
					paneCtrl.$handleEl = element.children().eq(1);
					paneCtrl.$scrollViewEl = element.children().eq(2);

					$transcludeScope.$pane = paneCtrl

					/*
					 * directive scope listeners
					 */
					$transcludeScope.$on('fa-pane-attach', function (event, child) {
						if (child !== paneCtrl) {
							event.stopPropagation();
							paneCtrl.addChild(child);
						}
					});

					$transcludeScope.$on('fa-pane-detach', function (event, child) {
						if (child !== paneCtrl) {
							event.stopPropagation();
							paneCtrl.removeChild(child);
						}
					});

					$transcludeScope.$on('$destroy', function () {
						$transcludeScope.$emit('fa-pane-detach', paneCtrl);
						$window.removeEventListener('resize', handleWindowResize);
					});

					scope.$emit('fa-pane-attach', paneCtrl);
				});
			}
		};
	})

	ngModule.directive('faPaneToggle', function () {
		return {
			restrict: 'A',
			require: `^^${directiveName}`,
			link: function (scope, elem) {
				elem.on('click', function (event) {
					event.preventDefault();
					scope.$pane.toggle();
				})
			}
		};
	})

	ngModule.directive('faPaneResizer', function ($window) {

		/**
		 * throttle
		 *
		 * Taken from underscore project
		 *
		 * @param {Function} func
		 * @param {number} wait
		 * @param {Object} options
		 * @returns {Function}
		 */
		function throttle(func, wait, options) {
			'use strict';
			const getTime = (Date.now || function () {
				return new Date().getTime();
			});
			let context, args, result;
			let timeout = null;
			let previous = 0;
			options = options || {};
			const later = function () {
				previous = options.leading === false ? 0 : getTime();
				timeout = null;
				result = func.apply(context, args);
				context = args = null;
			};
			return function () {
				const now = getTime();
				if (!previous && options.leading === false) {
					previous = now;
				}
				const remaining = wait - (now - previous);
				context = this;
				args = arguments;
				if (remaining <= 0) {
					clearTimeout(timeout);
					timeout = null;
					previous = now;
					result = func.apply(context, args);
					context = args = null;
				} else if (!timeout && options.trailing !== false) {
					timeout = setTimeout(later, remaining);
				}
				return result;
			};
		}

		return {
			restrict: 'A',
			require: `^^${directiveName}`,
			link: function (scope, element) {
				// return unless $pane
				const $pane = scope.$pane;

				const elem = element[0];

				const clickRadius = 5;
				const clickTime = 300;

				scope.$watch((function () {
					return $pane.getOrientation();
				}), function (newOrientation) {
					switch (newOrientation) {
						case 'vertical':
							element.removeClass('vertical');
							element.addClass('horizontal');
							break;
						case 'horizontal':
							element.addClass('vertical');
							element.removeClass('horizontal');
							break;
					}
				});

				scope.$watch(function () {
					return $pane.noResize;
				}, function (newVal, oldVal) {
					if (newVal === oldVal) return;

					if (newVal) {
						element.addClass('fa-pane-no-resize');
					} else {
						element.removeClass('fa-pane-no-resize');
					}
				});

				elem.addEventListener('mousedown', function (event) {
					if (event.button !== 0 || event.currentTarget !== event.target || $pane.noResize) {
						return;
					}

					const anchor = $pane.anchor;
					let coord;
					if (anchor === 'north' || anchor === 'south') {
						coord = 'clientY';
					} else if (anchor === 'west' || anchor === 'east') {
						coord = 'clientX';
					}

					let scale;
					if (anchor === 'north' || anchor === 'west') {
						scale = 1;
					} else if (anchor === 'south' || anchor === 'east') {
						scale = -1;
					}

					const startPos = {
						x: event.screenX,
						y: event.screenY
					};
					const startCoord = event[coord];
					const startSize = $pane.size;
					const startTime = Date.now();

					// Not sure if this really adds value, but added for compatibility
					elem.unselectable = 'on';
					elem.onselectstart = function () {
						return false;
					};
					elem.style.userSelect = elem.style.MozUserSelect = elem.style.msUserSelect = elem.style.webkitUserSelect = 'none';

					// Null out the event to re-use e and prevent memory leaks
					event.preventDefault();
					event = null;

					// Prevent the reflow logic from happening too often
					const handleMouseMoveThrottled = throttle(handleMouseMove, 33, { trailing: false });

					$window.addEventListener('mouseup', handleMouseUp, true);
					$window.addEventListener('mousemove', handleMouseMoveThrottled, true);

					function handleMouseMove(event) {

						$pane.$onStartResize();

						// Inside Angular's digest, determine the ideal size of the element
						// according to movements then determine if those movements have been
						// constrained by boundaries, other panes or min/max clauses
						scope.$apply(function () {
							const targetSize = startSize + scale * (event[coord] - startCoord);

							$pane.resize(targetSize);
						});

						event.preventDefault();
					}

					function handleMouseUp(event) {
						const displacementSq = Math.pow(event.screenX - startPos.x, 2) + Math.pow(event.screenY - startPos.y, 2);
						const timeElapsed = Date.now() - startTime;

						$window.removeEventListener('mousemove', handleMouseMoveThrottled, true);
						$window.removeEventListener('mouseup', handleMouseUp, true);

						if (!(displacementSq <= Math.pow(clickRadius, 2) && timeElapsed <= clickTime)) {
							// In case the mouse is released at the end of a throttle period
							handleMouseMove(event);
						}

						// clean up
						$pane.$onStopResize();

						event.preventDefault();
					}
				});
			}
		};
	})

	/*the place to place the generated angular templateCache*/

	return ngModule
}));
