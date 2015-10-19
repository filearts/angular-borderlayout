/**
 * angular-borderlayout2 - A set of Angular.js components to manage and define border layouts
 * @version v0.5.4
 * @link https://github.com/e-cloud/angular-borderlayout
 * @license MIT
 */
(function (root, factory) {

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['angular'], factory);
	} else if (typeof module === 'object' && module.exports) {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.
		// to support bundler like browserify
		module.exports = factory(require('angular'));
	} else {
		// Browser globals (root is window)
		factory(root.angular);
	}

}(this, function (angular) {

	var module = angular.module("fa.directive.borderLayout", []);

	module.factory("paneManager", function () {
		return {
			panes: {},
			get: function (paneId) {
				return this.panes[paneId];
			},
			set: function (paneId, pane) {
				return this.panes[paneId] = pane;
			},
			remove: function (paneId) {
				return delete this.panes[paneId];
			}
		};
	});

	module.factory('Region', function () {

		/*
		 region represents a rectangle container, could be any block dom element(assuming)
		 */
		function Region(width, height, top, right, bottom, left) {
			this.width = width != null ? width : 0;
			this.height = height != null ? height : 0;
			this.top = top != null ? top : 0;
			this.right = right != null ? right : 0;
			this.bottom = bottom != null ? bottom : 0;
			this.left = left != null ? left : 0;
		}

		Region.prototype.clone = function () {
			return new Region(this.width, this.height, this.top, this.right, this.bottom, this.left);
		};

		/*
		 put in string like 'vertical' or 'horizontal' as orientation and
		 strings like '50% - 4px' or "1.3&" as the target to interpret.

		 */
		Region.prototype.calculateSize = function (orientation, target) {
			var matches, terms;

			if (target == null) {
				target = 0;
			}

			// todo: don't know what they means
			var total = this.getSize(orientation);

			var available = this.getAvailableSize(orientation);

			if (angular.isNumber(target)) {
				if (target >= 1) {
					return Math.round(target);
				}
				// target -> [0,1)
				if (target >= 0) {
					return Math.round(target * total);
				}
				return 0;
			}

			// Kill whitespace
			target = target.replace(/\s+/mg, "");

			// Allow for complex sizes, calculate them recursively
			// e.g.: 50% - 4px
			if ((terms = target.split("-")).length > 1) {
				// todo: there is something logically wrong like "52px-62px-56px+65px", it can't cal-it correctly
				return this.calculateSize(orientation, terms.shift()) - this.calculateSize(orientation, terms.join("+"));
			}

			// interpret string like "52+62px"
			if ((terms = target.split("+")).length > 1) {
				return this.calculateSize(orientation, terms.shift()) + this.calculateSize(orientation, terms.join("+"));
			}

			// strings like '56px'
			if (matches = target.match(/^(\d+)(?:px)?$/)) {
				return parseInt(matches[1], 10);
			}

			// strings like '10.2&' mean multiple to the available size
			if (matches = target.match(/^(\d+(?:\.\d+)?)&$/)) {
				return Math.round(available * parseFloat(matches[1]) / 100);
			}

			// '10%' multiple the total size
			if (matches = target.match(/^(\d+(?:\.\d+)?)%$/)) {
				return Math.round(total * parseFloat(matches[1]) / 100);
			}

			throw new Error("Unsupported size: " + target);
		};

		Region.prototype.consume = function (anchor, size) {
			var style;

			if (size == null) {
				size = 0;
			}

			switch (anchor) {
				case "north":
					style = {
						top: "" + this.top + "px",
						right: "" + this.right + "px",
						bottom: "auto",
						left: "" + this.left + "px",
						height: "" + size + "px",
						width: "auto"
					};
					this.top += size;
					break;
				case "east":
					style = {
						top: "" + this.top + "px",
						right: "" + this.right + "px",
						bottom: "" + this.bottom + "px",
						left: "auto",
						width: "" + size + "px",
						height: "auto"
					};
					this.right += size;
					break;
				case "south":
					style = {
						top: "auto",
						right: "" + this.right + "px",
						bottom: "" + this.bottom + "px",
						left: "" + this.left + "px",
						height: "" + size + "px",
						width: "auto"
					};
					this.bottom += size;
					break;
				case "west":
					style = {
						top: "" + this.top + "px",
						right: "auto",
						bottom: "" + this.bottom + "px",
						left: "" + this.left + "px",
						width: "" + size + "px",
						height: "auto"
					};
					this.left += size;
					break;
			}

			if (size === 0) {
				style.display = "none";
			}

			return style;
		};

		Region.prototype.getInnerRegion = function () {
			return new Region(this.width - this.right - this.left, this.height - this.top - this.bottom);
		};

		Region.prototype.getSize = function (orientation) {
			switch (orientation) {
				case "vertical":
					return this.height;
				case "horizontal":
					return this.width;
			}
		};

		Region.prototype.getAvailableSize = function (orientation) {
			switch (orientation) {
				case "vertical":
					return this.height - this.top - this.bottom;
				case "horizontal":
					return this.width - this.right - this.left;
			}
		};

		Region.prototype.toString = function () {
			return "{" + this.top + ", " + this.right + ", " + this.bottom + ", " +
				this.left + "}, {" + this.width + ", " + this.height + "}";
		};

		return Region;

	});

	module.directive("faPane", ["$window", "$templateCache", "paneManager", function ($window, $templateCache, paneManager) {

		var getOrientation = function (anchor) {
			switch (anchor) {
				case "north":
				case "south":
					return "vertical";
				case "east":
				case "west":
					return "horizontal";
			}
		};

		var getScrollerStyle = function (anchor, size) {
			var style = {
				top: 0,
				right: 0,
				bottom: 0,
				left: 0
			};

			if (size) {
				switch (anchor) {
					case "north":
						style.bottom = "auto";
						style.height = "" + size + "px";
						break;
					case "east":
						style.left = "auto";
						style.width = "" + size + "px";
						break;
					case "south":
						style.top = "auto";
						style.height = "" + size + "px";
						break;
					case "west":
						style.right = "auto";
						style.width = "" + size + "px";
						break;
				}
			} else {
				switch (anchor) {
					case "north":
					case "south":
						style.height = 0;
						break;
					case "west":
					case "east":
						style.width = 0;
						break;
				}
			}

			return style;
		};

		var getHandleStyle = function (anchor, region, handleSize) {
			switch (anchor) {
				case "north":
					return {
						height: region.calculateSize('vertical', handleSize) + "px",
						right: 0,
						left: 0,
						bottom: 0
					};
				case "south":
					return {
						height: region.calculateSize('vertical', handleSize) + "px",
						right: 0,
						left: 0,
						top: 0
					};
				case "east":
					return {
						width: region.calculateSize('horizontal', handleSize) + "px",
						top: 0,
						bottom: 0,
						left: 0
					};
				case "west":
					return {
						width: region.calculateSize('horizontal', handleSize) + "px",
						top: 0,
						bottom: 0,
						right: 0
					};
			}
		};

		var generateSerialId = (function () {
			var counter = 0;

			var fun = function () {
				return counter++;
			};

			fun.peek = function () {
				return counter;
			};

			return fun;
		})();

		var stringToBoolean = function stringToBoolean(str) {
			if (angular.isString(str)) {
				str = angular.lowercase(str) === 'true';
			}
			return !!str
		};

		var promise = null;

		// BEGIN DIRECTIVE DECLARATION
		return {
			restrict: "A",
			replace: true,
			require: "faPane",
			priority: 1,
			transclude: "element",
			scope: {
				anchor: "@paneAnchor",
				paneId: "@faPane",
				size: "@paneSize",
				min: "@paneMin",
				max: "@paneMax",
				handle: "@paneHandle",
				closed: "=paneClosed",
				order: "@paneOrder",
				noResize: "@paneNoResize",
				noToggle: "@paneNoToggle"
			},
			template: $templateCache.get('template/borderLayout.tpl.html'),
			controllerAs: "$pane",
			controller: ["$rootScope", "$scope", "$attrs", "$timeout", "Region", function faPaneController($rootScope, $scope, $attrs, $timeout, Region) {
				angular.extend(this, {
					children: [],
					closed: false,
					noToggle: false,
					noResize: false,
					max: Number.MAX_VALUE,
					min: 0,
					order: 0,
					// Schedule a re-flow later in the digest cycle, but do not reflow
					// more than necessary
					$scheduleReflow: function () {
						var $pane = this;
						if ($pane.paneParent) {
							$pane.paneParent.$scheduleReflow();
						} else if (!$pane.$reflowScheduled) {
							$pane.$reflowScheduled = true;

							$rootScope.$evalAsync(function () {
								if ($pane.$reflowScheduled) {
									$pane.reflow();
								}

								$pane.$reflowScheduled = false;
							});
						}
					},
					$onStartResize: function () {
						if (this.$parent) {
							this.paneParent.$containerEl.addClass("fa-pane-resizing");
						} else {
							this.$containerEl.addClass("fa-pane-resizing");
						}
					},
					$onStopResize: function () {
						if (this.$parent) {
							this.paneParent.$containerEl.removeClass("fa-pane-resizing");
						} else {
							this.$containerEl.removeClass("fa-pane-resizing");
						}
					},
					getOptions: function () {
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
					setOptions: function (options) {
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
					setAnchor: function (anchor) {
						this.anchor = anchor;

						this.$scheduleReflow();
					},
					setTargetSize: function (targetSize) {
						this.targetSize = targetSize;

						this.$scheduleReflow();
					},
					setMinSize: function (min) {
						this.min = min != null ? min : 0;

						this.$scheduleReflow();
					},
					setMaxSize: function (max) {
						this.max = max != null ? max : Number.MAX_VALUE;

						this.$scheduleReflow();
					},
					setOrder: function (order) {
						this.order = order || 0;

						this.$scheduleReflow();
					},
					setNoToggle: function (noToggle) {
						this.noToggle = !!noToggle;

						this.$scheduleReflow();
					},
					setNoResize: function (noResize) {
						this.noResize = !!noResize;
					},
					setHandleSize: function (handleSize) {
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
					addChild: function (child) {
						child.paneParent = this;
						this.children.push(child);

						if (this.children.length) {
							this.$containerEl.addClass("fa-pane-parent");
						}

						//this.$scheduleReflow();
					},
					getOrientation: function () {
						return getOrientation(this.anchor);
					},
					onHandleDown: function () {
						this.$containerEl.addClass("active");
					},
					onHandleUp: function () {
						this.$containerEl.removeClass("active");

						this.$scheduleReflow();
					},
					removeChild: function (child) {
						var index;

						if (!(0 > (index = this.children.indexOf(child)))) {
							this.children.splice(index, 1);
						}

						if (!this.children.length) {
							this.$containerEl.removeClass("fa-pane-parent");
						}

						this.$scheduleReflow();
					},
					reflow: function (region) {
						var $pane = this;
						var width = $pane.$containerEl[0].offsetWidth;
						var height = $pane.$containerEl[0].offsetHeight;

						region || (region = new Region(width, height));

						var _ref = $pane.anchor;
						if (_ref === "north" || _ref === "east" || _ref === "south" || _ref === "west") {

							$pane.$containerEl.removeClass("fa-pane-orientation-vertical");
							$pane.$containerEl.removeClass("fa-pane-orientation-horizontal");

							var orientation = getOrientation($pane.anchor);

							$pane.$containerEl.addClass("fa-pane-orientation-" + orientation);
							$pane.anchor && $pane.$containerEl.addClass("fa-pane-direction-" + $pane.anchor);

							var handleSize = region.calculateSize(orientation, !$pane.closed &&
								$pane.handleSizeOpen || $pane.handleSizeClosed);

							var size = handleSize;
							if (!$pane.closed) {
								size = region.calculateSize(orientation, !$pane.closed && $pane.targetSize || handleSize);

								$pane.maxSize = $pane.max === Number.MAX_VALUE ?
									region.getSize(getOrientation($pane.anchor)) : region.calculateSize(orientation, $pane.max);
								$pane.minSize = region.calculateSize(orientation, $pane.min);
								size = Math.min(size, $pane.maxSize);
								size = Math.max(size, $pane.minSize);
								size = Math.min(size, region.getAvailableSize(orientation));
								size = Math.max(size, handleSize);
							}

							this.size = size;

							var styleContainer = region.consume($pane.anchor, size);
							var styleScroller = getScrollerStyle($pane.anchor, size - handleSize);
							var styleHandle = getHandleStyle($pane.anchor, region, handleSize);

							$pane.$containerEl.attr("style", "").css(styleContainer);
							$pane.$overlayEl.attr("style", "").css(styleScroller);
							$pane.$handleEl.attr("style", "").css(styleHandle);
							$pane.$scrollerEl.attr("style", "").css(styleScroller);

						} else {
							$pane.$containerEl.css({
								top: region.top + "px",
								right: region.right + "px",
								bottom: region.bottom + "px",
								left: region.left + "px",
								width: "auto",
								height: "auto"
							});
						}

						$pane.$region = region.clone();
						$pane.reflowChildren($pane.$region.getInnerRegion());

						if (promise !== null) {
							$timeout.cancel(promise);
						}

						promise = $timeout(function () {
							$rootScope.$broadcast("fa-pane-reflow-finished", $pane);
							promise = null;
						}, 400);

						$rootScope.$broadcast("fa-pane-resize", $pane);
					},
					reflowChildren: function (region) {
						var $pane = this;
						region || (region = $pane.$region);

						$pane.children.sort(function (a, b) {
							return a.order - b.order;
						});


						for (var i = 0; i < $pane.children.length; i++) {
							var child = $pane.children[i];
							child.reflow(region);
						}
					},
					resize: function (targetSize) {
						var $pane = this;
						if (targetSize == null) {
							targetSize = $pane.targetSize;
						}

						if (targetSize === $pane.size) return;

						$pane.targetSize = targetSize;

						if (targetSize > $pane.maxSize) {
							$pane.$containerEl.addClass("fa-pane-constrained");
							if ($pane.maxSize === $pane.size) {
								return;
							}
						} else if (targetSize < $pane.minSize) {
							$pane.$containerEl.addClass("fa-pane-constrained");
							if ($pane.minSize === $pane.size) {
								return;
							}
						} else {
							$pane.$containerEl.removeClass("fa-pane-constrained");
						}

						$pane.paneParent.reflowChildren($pane.paneParent.$region.getInnerRegion());
					},
					toggle: function (open) {
						var $pane = this;

						if (open == null) {
							open = !!$pane.closed;
						}

						$pane.closed = !open;

						if ($pane.closed) {
							$pane.$containerEl.addClass("fa-pane-closed");
						} else {
							$pane.$containerEl.removeClass("fa-pane-closed");
						}

						$pane.$scheduleReflow();
					}
				});
			}],
			link: function postlink(scope, el, attr, paneCtrl, transcludeFn) {
				// Tool used to force elements into their compile order
				var serialId = generateSerialId();

				var $transcludeScope = scope.$parent.$new();
				$transcludeScope.$pane = scope.$pane = paneCtrl;

				if (paneCtrl.order == null) {
					paneCtrl.order = serialId;
				}

				paneCtrl.id = attr['faPane'];

				/*
				 * scope watchers
				 */
				scope.$watch("anchor", function (anchor) {
					if (anchor === undefined)return;
					paneCtrl.setAnchor(anchor);
				});

				scope.$watch("size", function (targetSize) {
					//if (targetSize === undefined)return;
					paneCtrl.setTargetSize(targetSize);
				});

				scope.$watch("closed", function (closed) {
					if (closed === undefined)return;
					paneCtrl.toggle(!closed);
				});

				scope.$watch("min", function (min) {
					if (min === undefined)return;
					paneCtrl.setMinSize(min);
				});

				scope.$watch("max", function (max) {
					if (max === undefined)return;
					paneCtrl.setMaxSize(max);
				});

				/*scope.$watch("order", function (order) {
				 paneCtrl.setOrder(order);
				 });*/

				scope.$watch("noResize", function (noResize) {
					if (noResize === undefined)return;
					paneCtrl.setNoResize(stringToBoolean(noResize));
				});

				scope.$watch("noToggle", function (noToggle) {
					if (noToggle === undefined)return;
					paneCtrl.setNoToggle(stringToBoolean(noToggle));
				});

				// is this watcher useless?
				scope.$watch("paneId", function (paneId, prevPaneId) {
					if (prevPaneId) {
						paneManager.remove(prevPaneId);
						paneCtrl.$containerEl.removeClass('pane-' + prevPaneId)
					}

					paneManager.set(paneId, paneCtrl);
					paneCtrl.id = paneId;
					paneCtrl.$containerEl.addClass('pane-' + paneCtrl.id)
				});

				scope.$watch("handle", function (handle, prev) {
					if (handle === undefined)return;
					paneCtrl.setHandleSize(scope.$eval(handle));
				});

				paneCtrl.$isolateScope = scope;
				paneCtrl.$transcludeScope = $transcludeScope;

				/*
				 * directive scope listeners
				 */
				$transcludeScope.$on("fa-pane-attach", function (e, child) {
					if (child !== paneCtrl) {

						e.stopPropagation();
						paneCtrl.addChild(child);
					}
				});

				$transcludeScope.$on("fa-pane-detach", function (e, child) {
					if (child !== paneCtrl) {
						e.stopPropagation();
						paneCtrl.removeChild(child);
					}
				});

				$transcludeScope.$on("$stateChangeSuccess", function () {
					paneCtrl.$scheduleReflow();
				});

				//	paneCtrl.$transcludeScope.$on("$viewContentLoaded", function () {
				//		paneCtrl.$scheduleReflow();
				//	});

				$transcludeScope.$on("$destroy", function () {
					paneCtrl.$transcludeScope.$emit("fa-pane-detach", paneCtrl);
					$window.removeEventListener("resize", handleWindowResize);
				});

				/*
				 * window listener
				 */
				$window.addEventListener("resize", handleWindowResize);

				function handleWindowResize(e) {
					e.stopPropagation();
					paneCtrl.$scheduleReflow();
				}

				/*
				 * transclude function
				 */
				transcludeFn($transcludeScope, function (clone, scope) {
					clone.addClass("fa-pane-scroller");
					el.append(clone);

					paneCtrl.$containerEl = el;
					paneCtrl.$overlayEl = el.children().eq(0);
					paneCtrl.$handleEl = el.children().eq(1);
					paneCtrl.$scrollerEl = el.children().eq(2);

					scope.$emit("fa-pane-attach", paneCtrl);
				});
			}
		};
	}]);

	module.directive("faPaneToggle", function () {
		return {
			restrict: 'A',
			link: function ($scope, $el, $attrs) {
				$el.on('click', function (event) {
					event.preventDefault();
					$scope.$pane.toggle();
				})
			}
		};
	});

	module.directive("faPaneResizer", ["$window", function ($window) {

		/**
		 * throttle
		 *
		 * Taken from underscore project
		 *
		 * @param {Function} func
		 * @param {number} wait
		 * @param {ThrottleOptions} options
		 * @returns {Function}
		 */
		function throttle(func, wait, options) {
			'use strict';
			var getTime = (Date.now || function () {
				return new Date().getTime();
			});
			var context, args, result;
			var timeout = null;
			var previous = 0;
			options = options || {};
			var later = function () {
				previous = options.leading === false ? 0 : getTime();
				timeout = null;
				result = func.apply(context, args);
				context = args = null;
			};
			return function () {
				var now = getTime();
				if (!previous && options.leading === false) {
					previous = now;
				}
				var remaining = wait - (now - previous);
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
			restrict: "A",
			//require: "?^faPane",
			link: function ($scope, $element, $attrs) {
				// return unless $pane
				var $pane = $scope.$pane;

				var el = $element[0];

				var clickRadius = 5;
				var clickTime = 300;

				$scope.$watch((function () {
					return $pane.getOrientation();
				}), function (newOrientation) {
					switch (newOrientation) {
						case "vertical":
							$element.removeClass("horizontal");
							$element.addClass("vertical");
							break;
						case "horizontal":
							$element.addClass("horizontal");
							$element.removeClass("vertical");
							break;
					}
				});

				$scope.$watch(function () {
					return $pane.noResize;
				}, function (newVal) {
					if (newVal) {
						$element.addClass("fa-pane-no-resize");
					} else {
						$element.removeClass("fa-pane-no-resize");
					}
				});

				el.addEventListener("mousedown", function (e) {
					if (e.button !== 0 || e.currentTarget !== e.target || $pane.noResize) {
						return;
					}

					var anchor = $pane.anchor;
					var coord;
					if (anchor === "north" || anchor === "south") {
						coord = "clientY";
					} else if (anchor === "west" || anchor === "east") {
						coord = "clientX";
					}

					var scale;
					if (anchor === "north" || anchor === "west") {
						scale = 1;
					} else if (anchor === "south" || anchor === "east") {
						scale = -1;
					}

					var startPos = {
						x: e.screenX,
						y: e.screenY
					};
					var startCoord = e[coord];
					var startSize = $pane.size;
					var startTime = Date.now();

					//pane.onHandleDown();

					// Not sure if this really adds value, but added for compatibility
					el.unselectable = "on";
					el.onselectstart = function () {
						return false;
					};
					el.style.userSelect = el.style.MozUserSelect = el.style.msUserSelect = el.style.webkitUserSelect = "none";

					// Null out the event to re-use e and prevent memory leaks
					//e.setCapture();
					e.preventDefault();
					e.defaultPrevented = true;
					e = null;

					var handleMouseMove = function (e) {

						$pane.$onStartResize();

						// Inside Angular's digest, determine the ideal size of the element
						// according to movements then determine if those movements have been
						// constrained by boundaries, other panes or min/max clauses
						$scope.$apply(function () {
							var targetSize = startSize + scale * (e[coord] - startCoord);

							$pane.resize(targetSize);
						});

						// Null out the event in case of memory leaks
						//e.setCapture();
						e.preventDefault();
						e.defaultPrevented = true;
						e = null;
					};

					// Prevent the reflow logic from happening too often
					var handleMouseMoveThrottled = throttle(handleMouseMove, 33, {trailing: false});

					var handleMouseUp = function (e) {
						var displacementSq = Math.pow(e.screenX - startPos.x, 2) + Math.pow(e.screenY - startPos.y, 2);
						var timeElapsed = Date.now() - startTime;

						$window.removeEventListener("mousemove", handleMouseMoveThrottled, true);
						$window.removeEventListener("mouseup", handleMouseUp, true);

						if (!(displacementSq <= Math.pow(clickRadius, 2) && timeElapsed <= clickTime)) {
							// In case the mouse is released at the end of a throttle period
							handleMouseMove(e);
						}

						// clean up
						$pane.$onStopResize();

						// Null out the event in case of memory leaks
						//e.releaseCapture();
						e.preventDefault();
						e.defaultPrevented = true;
						e = null;
					};

					$window.addEventListener("mouseup", handleMouseUp, true);
					$window.addEventListener("mousemove", handleMouseMoveThrottled, true);
				});
			}
		};
	}]);

	angular.module("fa.directive.borderLayout").run(["$templateCache", function($templateCache) {$templateCache.put("template/borderLayout.tpl.html","<div class=\"fa-pane\"> <div class=\"fa-pane-overlay\"></div> <div class=\"fa-pane-handle\" fa-pane-resizer> <div ng-if=\"!$pane.noToggle\" class=\"fa-pane-toggle\" fa-pane-toggle></div> </div> </div>");}]);

	return module
}));
