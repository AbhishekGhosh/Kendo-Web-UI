/*
* Kendo UI Web v2012.3.1114 (http://kendoui.com)
* Copyright 2012 Telerik AD. All rights reserved.
*
* Kendo UI Web commercial licenses may be obtained at
* https://www.kendoui.com/purchase/license-agreement/kendo-ui-web-commercial.aspx
* If you do not own a commercial license, this file shall be governed by the
* GNU General Public License (GPL) version 3.
* For GPL requirements, please review: http://www.gnu.org/copyleft/gpl.html
*/
(function ($, undefined) {
    var kendo = window.kendo,
        ui = kendo.ui,
        keys = kendo.keys,
        extend = $.extend,
        proxy = $.proxy,
        Widget = ui.Widget,
        pxUnitsRegex = /^\d+(\.\d+)?px$/i,
        percentageUnitsRegex = /^\d+(\.\d+)?%$/i,
        NS = ".kendoSplitter",
        EXPAND = "expand",
        COLLAPSE = "collapse",
        CONTENTLOAD = "contentLoad",
        RESIZE = "resize",
        LAYOUTCHANGE = "layoutChange",
        HORIZONTAL = "horizontal",
        VERTICAL = "vertical",
        MOUSEENTER = "mouseenter",
        CLICK = "click",
        PANE = "pane",
        MOUSELEAVE = "mouseleave",
        FOCUSED = "k-state-focused",
        KPANE = "k-" + PANE,
        PANECLASS = "." + KPANE;

    function isPercentageSize(size) {
        return percentageUnitsRegex.test(size);
    }

    function isPixelSize(size) {
        return pxUnitsRegex.test(size);
    }

    function isFluid(size) {
        return !isPercentageSize(size) && !isPixelSize(size);
    }

    function panePropertyAccessor(propertyName, triggersResize) {
        return function(pane, value) {
            var paneConfig = $(pane).data(PANE);

            if (arguments.length == 1) {
                return paneConfig[propertyName];
            }

            paneConfig[propertyName] = value;

            if (triggersResize) {
                var splitter = this.element.data("kendoSplitter");
                splitter.trigger(RESIZE);
            }
        };
    }

    var Splitter = Widget.extend({
        init: function(element, options) {
            var that = this,
                isHorizontal;

            Widget.fn.init.call(that, element, options);

            that.wrapper = that.element;

            isHorizontal = that.options.orientation.toLowerCase() != VERTICAL;
            that.orientation = isHorizontal ? HORIZONTAL : VERTICAL;
            that._dimension = isHorizontal ? "width" : "height";
            that._keys = {
                decrease: isHorizontal ? keys.LEFT : keys.UP,
                increase: isHorizontal ? keys.RIGHT : keys.DOWN
            };

            that._resizeStep = 10;

            that.bind(RESIZE, proxy(that._resize, that));

            that._marker = kendo.guid().substring(0, 8);

            that._initPanes();

            that._resizeHandler = function() {
                that.trigger(RESIZE);
            };

            that._attachEvents();

            $(window).on("resize", that._resizeHandler);

            that.resizing = new PaneResizing(that);

            that.element.triggerHandler("init.kendoSplitter");
        },
        events: [
            EXPAND,

            COLLAPSE,

            CONTENTLOAD,

            RESIZE,

            LAYOUTCHANGE
        ],

        _attachEvents: function() {
            var that = this,
                orientation = that.options.orientation,
                splitbarSelector = ".k-splitbar-" + orientation,
                splitbarDraggableSelector = ".k-splitbar-draggable-" + orientation,
                expandCollapseSelector = ".k-splitbar .k-icon:not(.k-resize-handle)";

            that.element
                .on("keydown" + NS, splitbarSelector, "_keydown")
                .on("mousedown" + NS, splitbarSelector, function(e) { e.currentTarget.focus(); })
                .on("focus" + NS, splitbarSelector, function(e) { $(e.currentTarget).addClass(FOCUSED);  })
                .on("blur" + NS, splitbarSelector, function(e) { $(e.currentTarget).removeClass(FOCUSED); that.resizing.end(); })
                .on(MOUSEENTER + NS, splitbarDraggableSelector, function() { $(this).addClass("k-splitbar-" + that.orientation + "-hover"); })
                .on(MOUSELEAVE + NS, splitbarDraggableSelector, function() { $(this).removeClass("k-splitbar-" + that.orientation + "-hover"); })
                .on("mousedown" + NS, splitbarDraggableSelector, function() { that.resizing.end(); that._panes().append("<div class='k-splitter-overlay k-overlay' />"); })
                .on("mouseup" + NS, splitbarDraggableSelector, function() { that._panes().children(".k-splitter-overlay").remove(); })
                .on(MOUSEENTER + NS, expandCollapseSelector, function() { $(this).addClass("k-state-hover"); })
                .on(MOUSELEAVE + NS, expandCollapseSelector, function() { $(this).removeClass('k-state-hover'); })
                .on(CLICK + NS, ".k-splitbar .k-collapse-next, .k-splitbar .k-collapse-prev", that._arrowClick(COLLAPSE))
                .on(CLICK + NS, ".k-splitbar .k-expand-next, .k-splitbar .k-expand-prev", that._arrowClick(EXPAND))
                .on("dblclick" + NS, ".k-splitbar", proxy(that._togglePane, that))
                .parent().closest(".k-splitter").each(function() {
                    var parentSplitter = $(this),
                        splitter = parentSplitter.data("kendoSplitter");

                    if (splitter) {
                        splitter.bind(RESIZE, that._resizeHandler);
                    } else {
                        parentSplitter.one("init" + NS, function() {
                            $(this).data("kendoSplitter").bind(RESIZE, that._resizeHandler);
                            that._resizeHandler();
                        });
                    }
                });
        },

        options: {
            name: "Splitter",
            orientation: HORIZONTAL
        },

        destroy: function() {
            var that = this;

            Widget.fn.destroy.call(that);

            that.element.off(NS);
            that.resizing.destroy();

            $(window).off("resize", that._resizeHandler);

            kendo.destroy(that.element);
        },

        _keydown: function(e) {
            var that = this,
                key = e.keyCode,
                resizing = that.resizing,
                target = $(e.currentTarget),
                navigationKeys = that._keys,
                increase = key === navigationKeys.increase,
                decrease = key === navigationKeys.decrease,
                pane;

            if (increase || decrease) {
                if (e.ctrlKey) {
                    pane = target[decrease ? "next" : "prev"]();

                    if (resizing.isResizing()) {
                        resizing.end();
                    }

                    if (!pane[that._dimension]()) {
                        that._triggerAction(EXPAND, pane);
                    } else {
                        that._triggerAction(COLLAPSE, target[decrease ? "prev" : "next"]());
                    }
                } else {
                    resizing.move((decrease ? -1 : 1) * that._resizeStep, target);
                }
                e.preventDefault();
            } else if (key === keys.ENTER) {
                resizing.end();
                e.preventDefault();
            }
        },

        _initPanes: function() {
            var that = this,
                panesConfig = that.options.panes || [];

            that.element
                .addClass("k-widget").addClass("k-splitter")
                .children()
                .each(function (index, pane) {
                    var config = panesConfig && panesConfig[index];

                    pane = $(pane).attr("role", "group").addClass(KPANE);

                    pane.data(PANE, config ? config : {})
                        .toggleClass("k-scrollable", config ? config.scrollable !== false : true);
                    that.ajaxRequest(pane);
                })
                .end();

            that.trigger(RESIZE);
        },

        ajaxRequest: function(pane, url, data) {
            pane = $(pane);

            var that = this,
                paneConfig = pane.data(PANE);

            url = url || paneConfig.contentUrl;

            if (url) {
                pane.append("<span class='k-icon k-loading k-pane-loading' />");

                if (kendo.isLocalUrl(url)) {
                    jQuery.ajax({
                        url: url,
                        data: data || {},
                        type: "GET",
                        dataType: "html",
                        success: function (data) {
                            pane.html(data);

                            that.trigger(CONTENTLOAD, { pane: pane[0] });
                        }
                    });
                } else {
                    pane.removeClass("k-scrollable")
                        .html("<iframe src='" + url + "' frameborder='0' class='k-content-frame'>" +
                                "This page requires frames in order to show content" +
                              "</iframe>");
                }
            }
        },
        _triggerAction: function(type, pane) {
            if (!this.trigger(type, { pane: pane[0] })) {
                this[type](pane[0]);
            }
        },

        _togglePane: function(e) {
            var that = this,
                target = $(e.target),
                arrow;

            if (target.closest(".k-splitter")[0] != that.element[0]) {
                return;
            }

            arrow = target.children(".k-icon:not(.k-resize-handle)");

            if (arrow.length !== 1) {
                return;
            }

            if (arrow.is(".k-collapse-prev")) {
                that._triggerAction(COLLAPSE, target.prev());
            } else if (arrow.is(".k-collapse-next")) {
                that._triggerAction(COLLAPSE, target.next());
            } else if (arrow.is(".k-expand-prev")) {
                that._triggerAction(EXPAND, target.prev());
            } else if (arrow.is(".k-expand-next")) {
                that._triggerAction(EXPAND, target.next());
            }
        },
        _arrowClick: function (arrowType) {
            var that = this;

            return function(e) {
                var target = $(e.target),
                    pane;

                if (target.closest(".k-splitter")[0] != that.element[0]) {
                    return;
                }

                if (target.is(".k-" + arrowType + "-prev")) {
                    pane = target.parent().prev();
                } else {
                    pane = target.parent().next();
                }
                that._triggerAction(arrowType, pane);
            };
        },
        _updateSplitBar: function(splitbar, previousPane, nextPane) {
            var catIconIf = function(iconType, condition) {
                   return condition ? "<div class='k-icon " + iconType + "' />" : "";
                },
                orientation = this.orientation,
                draggable = (previousPane.resizable !== false) && (nextPane.resizable !== false),
                prevCollapsible = previousPane.collapsible,
                prevCollapsed = previousPane.collapsed,
                nextCollapsible = nextPane.collapsible,
                nextCollapsed = nextPane.collapsed;

            splitbar.addClass("k-splitbar k-state-default k-splitbar-" + orientation)
                    .attr("role", "separator")
                    .attr("aria-expanded", !(prevCollapsed || nextCollapsed))
                    .removeClass("k-splitbar-" + orientation + "-hover")
                    .toggleClass("k-splitbar-draggable-" + orientation,
                        draggable && !prevCollapsed && !nextCollapsed)
                    .toggleClass("k-splitbar-static-" + orientation,
                        !draggable && !prevCollapsible && !nextCollapsible)
                    .html(
                        catIconIf("k-collapse-prev", prevCollapsible && !prevCollapsed && !nextCollapsed) +
                        catIconIf("k-expand-prev", prevCollapsible && prevCollapsed && !nextCollapsed) +
                        catIconIf("k-resize-handle", draggable) +
                        catIconIf("k-collapse-next", nextCollapsible && !nextCollapsed && !prevCollapsed) +
                        catIconIf("k-expand-next", nextCollapsible && nextCollapsed && !prevCollapsed)
                    );
        },
        _updateSplitBars: function() {
            var that = this;

            this.element.children(".k-splitbar").each(function() {
                var splitbar = $(this),
                    previousPane = splitbar.prev(PANECLASS).data(PANE),
                    nextPane = splitbar.next(PANECLASS).data(PANE);

                if (!nextPane) {
                    return;
                }

                that._updateSplitBar(splitbar, previousPane, nextPane);
            });
        },
        _panes: function() {
            return this.element.children(PANECLASS);
        },
        _resize: function() {
            var that = this,
                element = that.element,
                panes = element.children(":not(.k-splitbar)"),
                isHorizontal = that.orientation == HORIZONTAL,
                splitBars = element.children(".k-splitbar"),
                splitBarsCount = splitBars.length,
                sizingProperty = isHorizontal ? "width" : "height",
                totalSize = element[sizingProperty]();

            if (splitBarsCount === 0) {
                splitBarsCount = panes.length - 1;
                panes.slice(0, splitBarsCount)
                     .after("<div tabindex='0' class='k-splitbar' data-marker='" + that._marker + "' />");

                that._updateSplitBars();
                splitBars = element.children(".k-splitbar");
            } else {
                that._updateSplitBars();
            }

            // discard splitbar sizes from total size
            splitBars.each(function() {
                totalSize -= this[isHorizontal ? "offsetWidth" : "offsetHeight"];
            });

            var sizedPanesWidth = 0,
                sizedPanesCount = 0,
                freeSizedPanes = $();

            panes.css({ position: "absolute", top: 0 })
                [sizingProperty](function() {
                    var config = $(this).data(PANE) || {}, size;

                    if (config.collapsed) {
                        size = 0;
                        $(this).css("overflow", "hidden");
                    } else if (isFluid(config.size)) {
                        freeSizedPanes = freeSizedPanes.add(this);
                        return;
                    } else { // sized in px/%, not collapsed
                        size = parseInt(config.size, 10);

                        if (isPercentageSize(config.size)) {
                            size = Math.floor(size * totalSize / 100);
                        }
                    }

                    sizedPanesCount++;
                    sizedPanesWidth += size;

                    return size;
                });

            totalSize -= sizedPanesWidth;

            var freeSizePanesCount = freeSizedPanes.length,
                freeSizePaneWidth = Math.floor(totalSize / freeSizePanesCount);

            freeSizedPanes
                .slice(0, freeSizePanesCount - 1)
                    .css(sizingProperty, freeSizePaneWidth)
                .end()
                .eq(freeSizePanesCount - 1)
                    .css(sizingProperty, totalSize - (freeSizePanesCount - 1) * freeSizePaneWidth);

            // arrange panes
            var sum = 0,
                alternateSizingProperty = isHorizontal ? "height" : "width",
                positioningProperty = isHorizontal ? "left" : "top",
                sizingDomProperty = isHorizontal ? "offsetWidth" : "offsetHeight";

            if (freeSizePanesCount === 0) {
                var lastNonCollapsedPane = panes.filter(function() {
                    return !(($(this).data(PANE) || {}).collapsed);
                }).last();

                lastNonCollapsedPane[sizingProperty](totalSize + lastNonCollapsedPane[0][sizingDomProperty]);
            }

            element.children()
                .css(alternateSizingProperty, element[alternateSizingProperty]())
                .each(function (i, child) {
                    child.style[positioningProperty] = Math.floor(sum) + "px";
                    sum += child[sizingDomProperty];
                });

            that.trigger(LAYOUTCHANGE);
        },

        toggle: function(pane, expand) {
            var paneConfig;

            pane = $(pane);
            paneConfig = pane.data(PANE);

            if (!expand && !paneConfig.collapsible) {
                return;
            }

            if (arguments.length == 1) {
                expand = paneConfig.collapsed === undefined ? false : paneConfig.collapsed;
            }

            paneConfig.collapsed = !expand;

            if (paneConfig.collapsed) {
                pane.css("overflow", "hidden");
            } else {
                pane.css("overflow", "");
            }

            this.trigger(RESIZE);

            this.resizing.destroy();
            this.resizing = new PaneResizing(this);
        },

        collapse: function(pane) {

            this.toggle(pane, false);
        },

        expand: function(pane) {
            this.toggle(pane, true);
        },

        size: panePropertyAccessor("size", true),

        min: panePropertyAccessor("min"),

        max: panePropertyAccessor("max")
    });

    ui.plugin(Splitter);

    var verticalDefaults = {
            sizingProperty: "height",
            sizingDomProperty: "offsetHeight",
            alternateSizingProperty: "width",
            positioningProperty: "top",
            mousePositioningProperty: "pageY"
        };

    var horizontalDefaults = {
            sizingProperty: "width",
            sizingDomProperty: "offsetWidth",
            alternateSizingProperty: "height",
            positioningProperty: "left",
            mousePositioningProperty: "pageX"
        };

    function PaneResizing(splitter) {
        var that = this,
            orientation = splitter.orientation;

        that.owner = splitter;
        that._element = splitter.element;
        that.orientation = orientation;

        extend(that, orientation === HORIZONTAL ? horizontalDefaults : verticalDefaults);

        that._resizable = new kendo.ui.Resizable(splitter.element, {
            orientation: orientation,
            handle: ".k-splitbar-draggable-" + orientation + "[data-marker=" + splitter._marker + "]",
            hint: proxy(that._createHint, that),
            start: proxy(that._start, that),
            max: proxy(that._max, that),
            min: proxy(that._min, that),
            invalidClass:"k-restricted-size-" + orientation,
            resizeend: proxy(that._stop, that)
        });
    }

    PaneResizing.prototype = {
        press: function(target) {
            this._resizable.press(target);
        },

        move: function(delta, target) {
            if (!this._resizable.target) {
                this._resizable.press(target);
            }

            this._resizable.move(delta);
        },

        end: function() {
            this._resizable.end();
        },

        destroy: function() {
            this._resizable.destroy();
        },

        isResizing: function() {
            return this._resizable.resizing;
        },

        _createHint: function(handle) {
            var that = this;
            return $("<div class='k-ghost-splitbar k-ghost-splitbar-" + that.orientation + " k-state-default' />")
                        .css(that.alternateSizingProperty, handle[that.alternateSizingProperty]());
        },

        _start: function(e) {
            var that = this,
                splitbar = $(e.currentTarget),
                previousPane = splitbar.prev(),
                nextPane = splitbar.next(),
                previousPaneConfig = previousPane.data(PANE),
                nextPaneConfig = nextPane.data(PANE),
                prevBoundary = parseInt(previousPane[0].style[that.positioningProperty], 10),
                nextBoundary = parseInt(nextPane[0].style[that.positioningProperty], 10) + nextPane[0][that.sizingDomProperty] - splitbar[0][that.sizingDomProperty],
                totalSize = that._element.css(that.sizingProperty),
                toPx = function (value) {
                    var val = parseInt(value, 10);
                    return (isPixelSize(value) ? val : (totalSize * val) / 100) || 0;
                },
                prevMinSize = toPx(previousPaneConfig.min),
                prevMaxSize = toPx(previousPaneConfig.max) || nextBoundary - prevBoundary,
                nextMinSize = toPx(nextPaneConfig.min),
                nextMaxSize = toPx(nextPaneConfig.max) || nextBoundary - prevBoundary;

            that.previousPane = previousPane;
            that.nextPane = nextPane;
            that._maxPosition = Math.min(nextBoundary - nextMinSize, prevBoundary + prevMaxSize);
            that._minPosition = Math.max(prevBoundary + prevMinSize, nextBoundary - nextMaxSize);
        },
        _max: function(e) {
              return this._maxPosition;
        },
        _min: function(e) {
            return this._minPosition;
        },
        _stop: function(e) {
            var that = this,
                splitbar = $(e.currentTarget),
                owner = that.owner;

            owner._panes().children(".k-splitter-overlay").remove();

            if (e.keyCode !== kendo.keys.ESC) {
                var ghostPosition = e.position,
                    previousPane = splitbar.prev(),
                    nextPane = splitbar.next(),
                    previousPaneConfig = previousPane.data(PANE),
                    nextPaneConfig = nextPane.data(PANE),
                    previousPaneNewSize = ghostPosition - parseInt(previousPane[0].style[that.positioningProperty], 10),
                    nextPaneNewSize = parseInt(nextPane[0].style[that.positioningProperty], 10) + nextPane[0][that.sizingDomProperty] - ghostPosition - splitbar[0][that.sizingDomProperty],
                    fluidPanesCount = that._element.children(PANECLASS).filter(function() { return isFluid($(this).data(PANE).size); }).length;

                if (!isFluid(previousPaneConfig.size) || fluidPanesCount > 1) {
                    if (isFluid(previousPaneConfig.size)) {
                        fluidPanesCount--;
                    }

                    previousPaneConfig.size = previousPaneNewSize + "px";
                }

                if (!isFluid(nextPaneConfig.size) || fluidPanesCount > 1) {
                    nextPaneConfig.size = nextPaneNewSize + "px";
                }

                owner.trigger(RESIZE);
            }

            setTimeout(function() {
                that.press(splitbar);
            });

            return false;
        }
    };

})(window.kendo.jQuery);
