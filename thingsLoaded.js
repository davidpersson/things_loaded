/*!
 * Things Loaded
 *
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 *
 * Copyright (c) 2013 David Persson <nperson@gmx.de>
 * Copyright (c) 2013 David DeSandro
 */
(function(window, $) {
  'use strict';

  var ThingsLoaded = {};

  // Image Checker

  ThingsLoaded.ImageChecker = function() {
    var _this = this;

    this.items = [];
    this.checkedCount = 0;
    this.hasAnyBroken = false;

    this.deferred = new $.Deferred();

    // Adds an image object.
    this.addImage = function(image) {
      _this.items.push(new ThingsLoaded.LoadingImage(image));
    };

    // Adds an image using its URL.
    this.addUrl = function(url) {
      var image = new Image();
      image.src = url;

      _this.addImage(image);
    };

    // Adds an image element and/or an element's background.
    this.addElement = function(element) {
      _this.addImage(element);
      _this.addBackgroundImage(element);
    };

    // Add image elements that are children of given element/selector and any
    // background images that are found on the element itself or its children.
    this.addFromElement = function(element) {
      var $element = $(element);

      // Find img elements.
      $element.find('img').each(function(k, v) {
        _this.addImage(v);
      });

      // Check if the element itself or any descendant for background images.
      $element.find('*').add(element).each(function(k, el) {
        _this.addBackgroundImage(el);
      });
      return _this;
    };

    // Add an element's background image if it has one.
    this.addBackgroundImage = function(element) {
      var source = $(element).css('background-image');
      var matches = source.match(/^url\((.*)\)/);

      if (matches !== null) {
        _this.addUrl(matches[1]);
      }
    };

    // The main method.
    this.run = function() {
      if (!_this.items.length) {
        _this.complete();
        return _this.deferred;
      }

      var onConfirm = function(ev, image) {
        _this.progress(image);
        _this.checkedCount++;

        if (_this.checkedCount === _this.items.length) {
          _this.complete();
        }
      };

      $.each(_this.items, function(k, loadingImage) {
        $(loadingImage.element).one('confirm', onConfirm);
        loadingImage.check();
      });

      return _this.deferred;
    };

    this.progress = function(image) {
      _this.hasAnyBroken = _this.hasAnyBroken || !image.isLoaded;

      setTimeout(function() {
        // HACK - Chrome triggers event before object properties have changed.
        _this.deferred.notify(_this, image);
      });
    };

    this.complete = function() {
      _this.isComplete = true;

      setTimeout(function() {
        // HACK - another setTimeout so that confirm happens after progress

        if (_this.hasAnyBroken) {
          _this.deferred.reject(_this);
        } else {
          _this.deferred.resolve(_this);
        }
      });
    };
  };

  ThingsLoaded.cachedLoadingImages = {};

  ThingsLoaded.LoadingImage = function(element) {
    var _this = this;

    this.element = element;
    this.proxied = undefined;

    this.check = function() {
      // First check cached any previous images that have same src.
      var image = ThingsLoaded.cachedLoadingImages[_this.element.src];
      if (image) {
        _this.useCached(image);
        return;
      }

      // Add this to cache.
      ThingsLoaded.cachedLoadingImages[_this.element.src] = _this;

      // If complete is true and browser supports natural sizes,
      // try to check for image status manually.
      if (_this.element.complete && _this.element.naturalWidth !== undefined ) {
        _this.confirm(_this.element.naturalWidth !== 0);
        return;
      }

      // If none of the checks above matched, simulate loading
      // on detached element.
      var unbindProxyEvents = function() {
        _this.proxied.onload = null;
        _this.proxied.onerror = null;
      };

      _this.proxied = new Image();
      _this.proxied.addEventListener('load', function() {
        _this.confirm(true);
        unbindProxyEvents();
      });
      _this.proxied.addEventListener('error', function() {
        _this.confirm(false);
        unbindProxyEvents();
      });
      _this.proxied.src = _this.element.src;
    };

    this.useCached = function(image) {
      if (image.isConfirmed) {
        _this.confirm(image.isLoaded);
      } else {
        $(image.element).one('confirm', function(ev, image) {
          _this.confirm(image.isLoaded);
        });
      }
    };

    this.confirm = function(isLoaded) {
      _this.isConfirmed = true;
      _this.isLoaded = isLoaded;
      $(_this.element).trigger('confirm', _this);
    };
  };

  // Image Preloader
  ThingsLoaded.ImagePreloader = function () {
    var _this = this;

    this.items = [];

    this.addUrl = function(url) {
      _this.items.push(url);
    };

    this.run = function() {
      var preloading = [];
      var checker = new ThingsLoaded.ImageChecker();

      $.each(_this.items, function(k, v) {
        var image = new Image();
        image.src = v;
        preloading.push(image);
        checker.addImage(image);
      });
      return checker.run();
    };
  };

  // Export object.
  window.ThingsLoaded = ThingsLoaded;
}(window, jQuery));

