(function (root, factory) {

	if (typeof define === 'function' && define.amd) {
		// AMD. Register as an anonymous module.
		define(['angular', 'underscore'], factory);
	} else if (typeof module === 'object' && module.exports) {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.
		// to support bundler like browserify
		module.exports = factory(require('angular'), require('underscore'));
	} else {
		// Browser globals (root is window)
		factory(angular, root._);
	}

}(this, function (angular, _) {

	var module = angular.module("fa.directive.borderLayout", []);

	var faDragged = false; // Fix dragging on toggle

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

    module.factory('Region', function(){

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

        Region.prototype.calculateSize = function (orientation, target) {
            var matches, terms;

            if (target == null) {
                target = 0;
            }

            var total = this.getSize(orientation);
            var available = this.getAvailableSize(orientation);

            if (angular.isNumber(target)) {
                if (target >= 1) {
                    return Math.round(target);
                }
                if (target >= 0) {
                    return Math.round(target * total);
                }
                return 0;
            }

            // Kill whitespace
            target = target.replace(/\s+/mg, "");

            // Allow for complex sizes, e.g.: 50% - 4px
            if ((terms = target.split("-")).length > 1) {
                return this.calculateSize(orientation, terms.shift()) - this.calculateSize(orientation, terms.join("+"));
            }
            if ((terms = target.split("+")).length > 1) {
                return this.calculateSize(orientation, terms.shift()) + this.calculateSize(orientation, terms.join("+"));
            }

            if (matches = target.match(/^(\d+)(?:px)?$/)) {
                return parseInt(matches[1], 10);
            }
            if (matches = target.match(/^(\d+(?:\.\d+)?)&$/)) {
                return Math.round(available * parseFloat(matches[1]) / 100);
            }
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

    })

	module.directive("faPane", ["$window", "$rootScope", "paneManager", "Region", function ($window, $rootScope, paneManager, Region) {


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
					noToggle: "@paneNoToggle"
				},
				template: '<div class=\"fa-pane {{$pane.id?\'pane-\'+$pane.id:\'pane-null-id\'}}\"> <div class=\"fa-pane-overlay\"></div> <div class=\"fa-pane-handle\" fa-pane-resizer> <div ng-if=\"!$pane.noToggle\" class=\"fa-pane-toggle\" ng-click=\"$pane.toggle()\"></div> </div> </div>',
				controllerAs: "$pane",
				controller: function () {
					angular.extend(this, {
						children: [],
						closed: false,
						noToggle: false,
						max: Number.MAX_VALUE,
						min: 0,
						// Schedule a re-flow later in the digest cycle, but do not reflow
						// more than necessary
						$scheduleReflow: function () {
							var $pane = this
							if ($pane.parent) {
								$pane.parent.$scheduleReflow();
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
								this.parent.$containerEl.addClass("fa-pane-resizing");
							} else {
								this.$containerEl.addClass("fa-pane-resizing");
							}
						},
						$onStopResize: function () {
							if (this.$parent) {
								this.parent.$containerEl.removeClass("fa-pane-resizing");
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
							this.min = min;

							this.$scheduleReflow();
						},
						setMaxSize: function (max) {
							this.max = max;

							this.$scheduleReflow();
						},
						setOrder: function (order) {
							this.order = order;

							this.$scheduleReflow();
						},
						setNoToggle: function (noToggle) {
							this.noToggle = noToggle;

							this.$scheduleReflow();
						},
						setHandleSize: function (handleSize) {
							if ((handleSize != null ? handleSize.open : void 0) ||
								(handleSize != null ? handleSize.closed : void 0)) {

								this.handleSizeOpen = parseInt(handleSize.open, 10) || 0;
								this.handleSizeClosed = parseInt(handleSize.closed, 10) || 0;
							} else {
								this.handleSizeOpen = this.handleSizeClosed = parseInt(handleSize, 10);
							}

							this.$scheduleReflow();
						},
						addChild: function (child) {
							child.parent = this;
							this.children.push(child);

							if (this.children.length) {
								this.$containerEl.addClass("fa-pane-parent");
							}

							this.$scheduleReflow();
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

								var handleSize = region.calculateSize(orientation, !$pane.closed &&
									$pane.handleSizeOpen || $pane.handleSizeClosed);

								var size = handleSize;
								if (!$pane.closed) {
									size = region.calculateSize(orientation, !$pane.closed && $pane.targetSize || handleSize);

									size = Math.min(size, region.calculateSize(orientation, $pane.max));
									size = Math.max(size, region.calculateSize(orientation, $pane.min));
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
							$pane.reflowChildren(region.getInnerRegion());

							$rootScope.$broadcast("fa-pane-resize", $pane);
						},
						reflowChildren: function (region) {
							var $pane = this;
							region || (region = $pane.$region);

							$pane.children.sort(function (a, b) {
								return a.order - b.order;
							});

							var results = [];

							for (var i = 0; i < $pane.children.length; i++) {
								var child = $pane.children[i];
								results.push(child.reflow(region));
							}

							return results;
						},
						resize: function (size) {
							var $pane = this;
							if (size == null) {
								size = $pane.targetSize;
							}

							$pane.targetSize = size;
							$pane.parent.reflowChildren($pane.parent.$region.getInnerRegion());

							if (size !== $pane.size) {
								$pane.$containerEl.addClass("fa-pane-constrained");
							} else {
								$pane.$containerEl.removeClass("fa-pane-constrained");
							}
						},
						toggle: function (open) {
							var $pane = this;
							// Fix for dragging on toggle
							if (faDragged) {
								faDragged = false;
								return $pane;
							}

							if (open == null) {
								open = !!$pane.closed;
							}

							$pane.closed = !open;

							var reflow = function () {
								if ($pane.parent) {
									$pane.parent.$scheduleReflow();
								} else {
									$pane.$scheduleReflow();
								}
							};

							if ($pane.closed) {
								$pane.$containerEl.addClass("fa-pane-closed");
							} else {
								$pane.$containerEl.removeClass("fa-pane-closed");
							}

							reflow();
						}
					});
				},
				compile: function ($el, $attrs, $transclude) {
					// Tool used to force elements into their compile order
					var serialId = generateSerialId();

					return function postlink($scope, $el, $attrs, $paneCtrl) {
						var $directiveScope = $scope.$parent.$new();
						$directiveScope.$pane = $scope.$pane = $paneCtrl;

						var $transcludeScope = $directiveScope.$new();

						if ($paneCtrl.order == null) {
							$paneCtrl.order = serialId;
						}

						$paneCtrl.id = $attrs.faPane;

						$paneCtrl.$isolateScope = $scope;
						$paneCtrl.$directiveScope = $directiveScope;
						$paneCtrl.$transcludeScope = $transcludeScope;

						$transclude($transcludeScope, function (clone) {
							clone.addClass("fa-pane-scroller");

							$el.append(clone);

							$paneCtrl.$containerEl = $el;
							$paneCtrl.$overlayEl = $el.children().eq(0);
							$paneCtrl.$handleEl = $el.children().eq(1);
							$paneCtrl.$scrollerEl = $el.children().eq(2);

							$scope.$watch("anchor", function (anchor) {
								$paneCtrl.setAnchor(anchor);
							});

							$scope.$watch("size", function (targetSize) {
								$paneCtrl.setTargetSize(targetSize);
							});

							$scope.$watch("closed", function (closed) {
								$paneCtrl.toggle(!closed);
							});

							$scope.$watch("min", function (min) {
								$paneCtrl.setMinSize(min != null ? min : 0);
							});

							$scope.$watch("max", function (max) {
								$paneCtrl.setMaxSize(max != null ? max : Number.MAX_VALUE);
							});

							$scope.$watch("order", function (order) {
								$paneCtrl.setOrder(order);
							});

							$scope.$watch("noToggle", function (noToggle) {
								$paneCtrl.setNoToggle(!!noToggle);
							});

							// is this watcher useless?
							$scope.$watch("paneId", function (paneId, prevPaneId) {
								if (prevPaneId) {
									paneManager.remove(prevPaneId);
								}

								paneManager.set(paneId, $paneCtrl);

								$paneCtrl.id = paneId;
							});

							$scope.$watch("handle", function (handle) {
								$paneCtrl.setHandleSize(handle);
							});

							// todo: something unused here
							$scope.$watch($attrs.paneHandleObj, (function (handle) {
								if (handle) {
									$paneCtrl.setHandleSize(handle);
								}
							}), true);

							$paneCtrl.$directiveScope.$on("fa-pane-attach", function (e, child) {
								if (child !== $paneCtrl) {

									e.stopPropagation();
									$paneCtrl.addChild(child);
								}
							});

							$paneCtrl.$directiveScope.$on("fa-pane-detach", function (e, child) {
								if (child !== $paneCtrl) {
									e.stopPropagation();
									$paneCtrl.removeChild(child);
								}
							});

							$window.addEventListener("resize", function (e) {
								e.stopPropagation();
								$paneCtrl.$scheduleReflow();
							});

							$paneCtrl.$directiveScope.$on("$stateChangeSuccess", function () {
								$paneCtrl.$scheduleReflow();
							});

							$paneCtrl.$directiveScope.$on("$viewContentLoaded", function () {
								$paneCtrl.$scheduleReflow();
							});

							$paneCtrl.$directiveScope.$emit("fa-pane-attach", $paneCtrl);

							$paneCtrl.$directiveScope.$on("$destroy", function () {
								$paneCtrl.$directiveScope.$emit("fa-pane-detach", $paneCtrl);
							});
						});
					};
				}
			};
		}]
	);

	// not used
	module.directive("faPaneToggle", ["paneManager", function (paneManager) {
			return {
				link: function ($scope, $el, $attrs) {
					$attrs.$observe("faPaneToggle", function (paneId) {
					});
				}
			};
		}]);

	module.directive("faPaneResizer", ["$window", function ($window) {

		return {
			restrict: "A",
			//require: "^faPane",
			link: function ($scope, $element, $attrs, $pane) {
				// return unless $pane
				$pane || ($pane = $scope.$pane);

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

				el.addEventListener("mousedown", function (e) {
					if (e.button !== 0) {
						return;
					}

					var anchor = $pane.anchor;
					var coord;
					if (anchor === "north" || anchor === "south") {
						coord = "screenY";
					} else if (anchor === "west" || anchor === "east") {
						coord = "screenX";
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
						faDragged = true; // Fix for dragging on toggle

						$pane.$onStartResize();

						// Inside Angular's digest, determine the ideal size of the element
						// according to movements then determine if those movements have been
						// constrained by boundaries, other panes or min/max clauses
						$scope.$apply(function () {
							var targetSize = startSize + scale * (e[coord] - startCoord);

							return $pane.resize(targetSize);
						});

						// Null out the event in case of memory leaks
						//e.setCapture();
						e.preventDefault();
						e.defaultPrevented = true;
						e = null;
					};

					// Prevent the reflow logic from happening too often
					var handleMouseMoveThrottled = _.throttle(handleMouseMove, 16);

					var handleMouseUp = function (e) {
						var displacementSq = Math.pow(e.screenX - startPos.x, 2) +
							Math.pow(e.screenY - startPos.y, 2);
						var timeElapsed = Date.now() - startTime;

						$window.removeEventListener("mousemove", handleMouseMoveThrottled, true);
						$window.removeEventListener("mouseup", handleMouseUp, true);

						var cleanup = function () {
							$pane.$onStopResize();

							// Null out the event in case of memory leaks
							//e.releaseCapture();
							e.preventDefault();
							e.defaultPrevented = true;
							e = null;
						};

						if (!(displacementSq <= Math.pow(clickRadius, 2) && timeElapsed <= clickTime)) {
							// In case the mouse is released at the end of a throttle period
							handleMouseMove(e);
						}

						cleanup();
						faDragged = false; // Fix for dragging on toggle
					};

					$window.addEventListener("mouseup", handleMouseUp, true);
					$window.addEventListener("mousemove", handleMouseMoveThrottled, true);
				});
			}
		};
	}]);

	return module
}));
