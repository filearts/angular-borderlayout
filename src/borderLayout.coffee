module = angular.module "fa.directive.borderLayout", [
]

module.factory "paneManager", ->
  panes: {}
  get: (paneId) -> @panes[paneId]
  set: (paneId, pane) -> @panes[paneId] = pane
  remove: (paneId) -> delete @panes[paneId]
  

module.directive "faPane", [ "$window", "$rootScope", "paneManager", ($window, $rootScope, paneManager) ->
  
  class Region
    constructor: (@width = 0, @height = 0, @top = 0, @right = 0, @bottom = 0, @left = 0) ->

    clone: -> new Region(@width, @height, @top, @right, @bottom, @left)
      
    calculateSize: (orientation, target = 0) ->
      total = @getSize(orientation)
      available = @getAvailableSize(orientation)
      
      if angular.isNumber(target)
        if target >= 1 then return Math.round(target)
        if target >= 0 then return Math.round(target * total)
        
        return 0
      
      # Kill whitespace
      target = target.replace /\s+/mg, ""
      
      # Allow for complex sizes, e.g.: 50% - 4px
      if (terms = target.split("-")).length > 1 then return @calculateSize(orientation, terms.shift()) - @calculateSize(orientation, terms.join("+"))
      if (terms = target.split("+")).length > 1 then return @calculateSize(orientation, terms.shift()) + @calculateSize(orientation, terms.join("+"))
        
      if matches = target.match /^(\d+)(?:px)?$/ then return parseInt(matches[1], 10)
      if matches = target.match /^(\d+(?:\.\d+)?)&$/ then return Math.round(available * parseFloat(matches[1]) / 100)
      if matches = target.match /^(\d+(?:\.\d+)?)%$/ then return Math.round(total * parseFloat(matches[1]) / 100)
      
      throw new Error("Unsupported size: #{target}")
    
    consume: (anchor, size = 0) ->
      switch anchor
        when "north"
          style = { top: "#{@top}px", right: "#{@right}px", bottom: "auto", left: "#{@left}px", height: "#{size}px", width: "auto" }
          @top += size
        when "east"
          style = { top: "#{@top}px", right: "#{@right}px", bottom: "#{@bottom}px", left: "auto", width: "#{size}px", height: "auto" }
          @right += size
        when "south"
          style = { top: "auto", right: "#{@right}px", bottom: "#{@bottom}px", left: "#{@left}px", height: "#{size}px", width: "auto" }
          @bottom += size
        when "west"
          style = { top: "#{@top}px", right: "auto", bottom: "#{@bottom}px", left: "#{@left}px", width: "#{size}px", height: "auto" }
          @left += size
      
      style.display = "none" if size is 0
        
      style
      
    getInnerRegion: ->
      new Region @width - @right - @left, @height - @top - @bottom
    
    getSize: (orientation) ->
      switch orientation
        when "vertical" then @height
        when "horizontal" then @width
    
    getAvailableSize: (orientation) ->
      switch orientation
        when "vertical" then @height - @top - @bottom
        when "horizontal" then @width - @right - @left
    
    toString: -> "{#{@top}, #{@right}, #{@bottom}, #{@left}}, {#{@width}, #{@height}}"  
  
  
  
  
  ## BEGIN UTILITY FUNCTIONS
  
  getOrientation = (anchor) ->
    switch anchor
      when "north", "south" then "vertical"
      when "east", "west" then "horizontal"  
      
  getScrollerStyle = (anchor, size) ->
    style =
      top: 0
      right: 0
      bottom: 0
      left: 0
    
    if size
      switch anchor
        when "north"
          style.bottom = "auto"
          style.height = "#{size}px"
        when "east"
          style.left = "auto"
          style.width = "#{size}px"
        when "south"
          style.top = "auto"
          style.height = "#{size}px"
        when "west"
          style.right = "auto"
          style.width = "#{size}px"
    
    style
      
  getHandleStyle = (anchor, region, handleSize) ->
    
    switch anchor
      when "north"
        height: "#{region.calculateSize('vertical', handleSize)}px"
        right: 0
        left: 0
        bottom: 0
      when "south" 
        height: "#{region.calculateSize('vertical', handleSize)}px"
        right: 0
        left: 0
        top: 0
      when "east"
        width: "#{region.calculateSize('horizontal', handleSize)}px"
        top: 0
        bottom: 0
        left: 0
      when "west" 
        width: "#{region.calculateSize('horizontal', handleSize)}px"
        top: 0
        bottom: 0
        right: 0
  
  generateSerialId = do ->
    counter = 0
    fun = -> counter++
    fun.peek = -> counter
    fun
  
      
  ## BEGIN DIRECTIVE DECLARATION
  
  restrict: "A"
  replace: true
  require: "faPane"
  priority: 1
  transclude: "element"
  scope:
    anchor: "@paneAnchor"
    paneId: "@faPane"
    size: "@paneSize"
    min: "@paneMin"
    max: "@paneMax"
    handle: "@paneHandle"
    closed: "=paneClosed"
    order: "@paneOrder"
    noToggle: "@paneNoToggle"
  template: """
    <div class="fa-pane pane-{{$pane.id}}">
      <div class="fa-pane-overlay"></div>
      <div class="fa-pane-handle" fa-pane-resizer>
        <div ng-if="!$pane.noToggle" class="fa-pane-toggle" ng-click="$pane.toggle()"></div>
      </div>
    </div>
  """
  controllerAs: "$pane"
  controller: ->
    $pane = new class Pane
      constructor: ->
        @children = []
        
        @closed = false
        @noToggle = false
        @max = Number.MAX_VALUE
        @min = 0

      
      # Schedule a reflow later in the digest cycle, but do not reflow more than
      # necessary
      $scheduleReflow: ->
        if $pane.parent then $pane.parent.$scheduleReflow()
        else unless $pane.$reflowScheduled
          $pane.$reflowScheduled = true
          
          $rootScope.$evalAsync ->
            if $pane.$reflowScheduled then $pane.reflow()
            
            $pane.$reflowScheduled = false

      $onStartResize: ->
        if $pane.$parent then $pane.parent.$containerEl.addClass("fa-pane-resizing")
        else $pane.$containerEl.addClass("fa-pane-resizing")

      $onStopResize: ->
        if $pane.$parent then $pane.parent.$containerEl.removeClass("fa-pane-resizing")
        else $pane.$containerEl.removeClass("fa-pane-resizing")
      
      getOptions: ->
        anchor: @anchor
        targetSize: @targetSize
        size: @size
        min: @min
        max: @max
        order: @order or 0
        handle:
          open: @handleSizeOpen or 0
          closed: @handleSizeClosed or 0
        noToggle: !!@noToggle
        closed: @closed
      
      setOptions: (options = {}) ->
        @setAnchor(options.anchor) if options.anchor?
        @setTargetSize(options.size) if options.size?
        @setMinSize(options.min) if options.min?
        @setMaxSize(options.max) if options.max?
        @setHandleSize(options.handle) if options.handle?
        @setOrder(options.order) if options.order?
        @setNoToggle(options.noToggle) if options.noToggle?
        @toggle(!options.closed) if options.closed?
        
      setAnchor: (@anchor) -> @$scheduleReflow()
      setTargetSize: (@targetSize) -> @$scheduleReflow()
      setMinSize: (@min) -> @$scheduleReflow()
      setMaxSize: (@max) -> @$scheduleReflow()
      setOrder: (@order) -> @$scheduleReflow()
      setNoToggle: (@noToggle) -> @$scheduleReflow()
      setHandleSize: (handleSize) ->
        if handleSize?.open or handleSize?.closed
          @handleSizeOpen = parseInt(handleSize.open, 10) or 0
          @handleSizeClosed = parseInt(handleSize.closed, 10) or 0
        else
          @handleSizeOpen = @handleSizeClosed = parseInt(handleSize, 10)
        @$scheduleReflow()

      
      addChild: (child) ->
        child.parent = $pane
        @children.push child
        
        $pane.$containerEl.addClass("fa-pane-parent") if @children.length
        
        $pane.$scheduleReflow()
      
      getOrientation: -> getOrientation($pane.anchor)
      onHandleDown: -> $pane.$containerEl.addClass("active")
      onHandleUp: ->
        $pane.$containerEl.removeClass("active")
        $pane.$scheduleReflow()
        
      removeChild: (child) ->
        @children.splice idx, 1 unless 0 > idx = @children.indexOf(child)
        
        $pane.$containerEl.removeClass("fa-pane-parent") unless @children.length
        
        $pane.$scheduleReflow()
      
      reflow: (region) ->
        width = $pane.$containerEl[0].offsetWidth
        height = $pane.$containerEl[0].offsetHeight
      
        region ||= new Region(width, height)
        
        if $pane.anchor in ["north", "east", "south", "west"]
          $pane.$containerEl.removeClass("fa-pane-orientation-vertical")
          $pane.$containerEl.removeClass("fa-pane-orientation-horizontal")
          
          orientation = getOrientation($pane.anchor)
  
          $pane.$containerEl.addClass("fa-pane-orientation-#{orientation}")

          handleSize = region.calculateSize(orientation, !$pane.closed and $pane.handleSizeOpen or $pane.handleSizeClosed)
          
          if $pane.closed
            size = handleSize
          else
            size = region.calculateSize(orientation, !$pane.closed and $pane.targetSize or handleSize)
            
            size = Math.min(size, region.calculateSize(orientation, $pane.max))
            size = Math.max(size, region.calculateSize(orientation, $pane.min))
            size = Math.min(size, region.getAvailableSize(orientation))
            size = Math.max(size, handleSize)
          
          @size = size
          
          styleContainer = region.consume($pane.anchor, size)
          styleScroller = getScrollerStyle($pane.anchor, size - handleSize)
          styleHandle = getHandleStyle($pane.anchor, region, handleSize)
         
          $pane.$containerEl.attr("style", "").css(styleContainer)
          $pane.$overlayEl.attr("style", "").css(styleScroller)
          $pane.$handleEl.attr("style", "").css(styleHandle)
          $pane.$scrollerEl.attr("style", "").css(styleScroller)

        else
          $pane.$containerEl.css
            top: "#{region.top}px"
            right: "#{region.right}px"
            bottom: "#{region.bottom}px"
            left: "#{region.left}px"
            width: "auto"
            height: "auto"
            
          
        $pane.$region = region.clone()
        $pane.reflowChildren region.getInnerRegion()

        $pane.$transcludeScope.$broadcast "fa-pane-resize", $pane
      
      reflowChildren: (region) ->
        region ||= $pane.$region
        
        $pane.children.sort (a, b) -> a.order - b.order
        child.reflow(region) for child in $pane.children

      # Attempt to resize the 
      resize: (size = $pane.targetSize) ->
        $pane.targetSize = size
        $pane.parent.reflowChildren($pane.parent.$region.getInnerRegion())
        
        if size != $pane.size then $pane.$containerEl.addClass("fa-pane-constrained")
        else $pane.$containerEl.removeClass("fa-pane-constrained")
      
      toggle: (open = !!$pane.closed) ->
        $pane.closed = !open
        
        reflow = ->
          if $pane.parent then $pane.parent.$scheduleReflow() 
          else $pane.$scheduleReflow()
        
        if $pane.closed then $pane.$containerEl.addClass "fa-pane-closed"
        else $pane.$containerEl.removeClass "fa-pane-closed"
        
        reflow()

  compile: ($el, $attrs, $transclude) ->
    # Tool used to force elements into their compile order
    serialId = generateSerialId()

    link = ($scope, $el, $attrs, $pane) ->
      $directiveScope = $scope.$parent.$new()
      $directiveScope.$pane = $scope.$pane = $pane
      
      $transcludeScope = $directiveScope.$new()
      
      $pane.order ?= serialId
      $pane.id = $attrs.faPane
      
      $pane.$isolateScope = $scope
      $pane.$directiveScope = $directiveScope
      $pane.$transcludeScope = $transcludeScope
      
      $transclude $transcludeScope, (clone) ->
        clone.addClass("fa-pane-scroller")
        
        $el.append(clone)
        
        $pane.$containerEl = $el
        $pane.$overlayEl = $el.children().eq(0)
        $pane.$handleEl = $el.children().eq(1)
        $pane.$scrollerEl = $el.children().eq(2)

        $scope.$watch "anchor", (anchor) -> $pane.setAnchor(anchor)
        $scope.$watch "size", (targetSize) -> $pane.setTargetSize(targetSize)
        $scope.$watch "closed", (closed) -> $pane.toggle(!closed)
        $scope.$watch "min", (min) -> $pane.setMinSize(if min? then min else 0)
        $scope.$watch "max", (max) -> $pane.setMaxSize(if max? then max else Number.MAX_VALUE)
        $scope.$watch "order", (order) -> $pane.setOrder(order)
        $scope.$watch "noToggle", (noToggle) -> $pane.setNoToggle(!!noToggle)
        $scope.$watch "paneId", (paneId, prevPaneId) ->
          paneManager.remove(prevPaneId) if prevPaneId
          paneManager.set(paneId, $pane)

          $pane.id = paneId
        
        $scope.$watch "handle", (handle) -> $pane.setHandleSize(handle)
        $scope.$watch $attrs.paneHandleObj, ((handle) -> $pane.setHandleSize(handle) if handle), true
        
        $pane.$directiveScope.$on "fa-pane-attach", (e, child) ->
          if child != $pane
            e.stopPropagation()
            
            $pane.addChild(child)
        
        $pane.$directiveScope.$on "fa-pane-detach", (e, child) ->
          if child != $pane
            e.stopPropagation()
            
            $pane.removeChild(child)
        
        $window.addEventListener "resize", (e) ->
          e.stopPropagation()
          $pane.$scheduleReflow()
          
        $pane.$directiveScope.$on "$stateChangeSuccess", ->
          $pane.$scheduleReflow()
          

        $pane.$directiveScope.$emit "fa-pane-attach", $pane
        $pane.$directiveScope.$on "$destroy", ->
          $pane.$directiveScope.$emit "fa-pane-detach", $pane
]

module.directive "faPaneToggle", [ "paneManager", (paneManager) ->
  link: ($scope, $el, $attrs) ->
    $attrs.$observe "faPaneToggle", (paneId) ->
]

module.directive "faPaneResizer", [ "$window", ($window) ->
  throttle = (delay, fn) ->
    throttled = false
    ->
      return if throttled
      
      throttled = true
      setTimeout ->
        throttled = false
      , delay
      
      fn.call(@, arguments...)


  restrict: "A"
  #require: "^faPane"
  link: ($scope, $element, $attrs, $pane) ->
    #return unless $pane
    
    $pane ||= $scope.$pane
    
    el = $element[0]
    
    clickRadius = 5
    clickTime = 300
    
    $scope.$watch ( -> $pane.getOrientation() ), (orientation) ->
      $element.removeClass("vertical")
      $element.removeClass("horizontal")
      
      switch orientation
        when "vertical" then $element.addClass("vertical")
        when "horizontal" then $element.addClass("horizontal")
    
    el.addEventListener "mousedown", (e) ->
      return unless e.button is 0
      
      anchor = $pane.anchor
      
      if anchor in ["north", "south"] then coord = "screenY"
      else if anchor in ["west", "east"] then coord = "screenX"

      if anchor in ["north", "west"] then scale = 1
      else if anchor in ["south", "east"] then scale = -1
    
      startPos = {x: e.screenX, y: e.screenY}
      startCoord = e[coord]
      startSize = $pane.size
      startTime = Date.now()
      
      ##pane.onHandleDown()
      
      # Not sure if this really adds value, but added for compatibility
      el.unselectable = "on"
      el.onselectstart = -> false
      el.style.userSelect = el.style.MozUserSelect = "none"
      
      # Null out the event to re-use e and prevent memory leaks
      #e.setCapture()
      e.preventDefault()
      e.defaultPrevented = true
      e = null

      handleMouseMove = (e) ->
        $pane.$onStartResize()
      
        # Inside Angular's digest, determine the ideal size of the element
        # according to movements then determine if those movements have been
        # constrained by boundaries, other panes or min/max clauses
        $scope.$apply ->
          targetSize = startSize + scale * (e[coord] - startCoord)
          
          $pane.resize targetSize

        # Null out the event in case of memory leaks
        #e.setCapture()
        e.preventDefault()
        e.defaultPrevented = true
        e = null
        
      handleMouseUp = (e) ->
        displacementSq = Math.pow(e.screenX - startPos.x, 2) + Math.pow(e.screenY - startPos.y, 2)
        timeElapsed = Date.now() - startTime

        $window.removeEventListener "mousemove", handleMouseMoveThrottled, true
        $window.removeEventListener "mouseup", handleMouseUp, true
        
        cleanup = ->
          $pane.$onStopResize()
        
          # Null out the event in case of memory leaks
          #e.releaseCapture()
          e.preventDefault()
          e.defaultPrevented = true
          e = null
        
        if displacementSq <= Math.pow(clickRadius, 2) and timeElapsed <= clickTime
          cleanup()
          return
          
        # In case the mouse is released at the end of a throttle period
        handleMouseMove(e)
        
        cleanup()

      
      # Prevent the reflow logic from happening too often
      handleMouseMoveThrottled = throttle(10, handleMouseMove)
    
      $window.addEventListener "mouseup", handleMouseUp, true
      $window.addEventListener "mousemove", handleMouseMoveThrottled, true
]

