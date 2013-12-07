/*!
 * Things Loaded
 *
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 *
 * Copyright (c) 2013 David Persson <nperson@gmx.de>
 */
(function(window, $) {
  'use strict';

  var ThingsLoaded = {};

  ThingsLoaded.ImageChecker = function() {
    var _this = this;

    this.images = [];
    this.checkedCount = 0;
    this.hasAnyBroken = false;

    this.deferred = new $.Deferred();

    this.addImage = function(image) {
      _this.images.push(new ThingsLoaded.LoadingImage(image));
    };

    this.addUrl = function(url) {
      var image = new Image();
      image.src = url;

      _this.addImage(image);
    };

    this.addElement = function(element) {
      var $element = $(element);

      // Find img elements.
      $element.find('img').each(function(k, v) {
        _this.addImage(v);
      });

      // Check if the element itself or any descendant for background images.
      $element.find('*').add(element).each(function(k, el) {
        var source = $(el).css('background-image');
        var matches = source.match(/^url\((.*)\)/);

        if (matches !== null) {
          _this.addUrl(matches[1]);
        }
      });
      return _this;
    };

    this.run = function() {
      if (!_this.images.length) {
        _this.complete();
        return _this.deferred;
      }

      var onConfirm = function(ev, image) {
        _this.progress(image);
        _this.checkedCount++;

        if (_this.checkedCount === _this.images.length) {
          _this.complete();
        }
      };

      for (var i=0; i < _this.images.length; i++) {
        var loadingImage = _this.images[i];

        loadingImage.one('confirm', onConfirm);
        loadingImage.check();
      }

      return _this.deferred;
    };

    this.progress = function(image) {
      _this.hasAnyBroken = _this.hasAnyBroken || !image.isLoaded;

      setTimeout(function() {
        // HACK - Chrome triggers event before object properties have changed. #83
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
      _this.proxied.onload = function() {
        _this.confirm(true);
        unbindProxyEvents();
      };
      _this.proxied.onerror = function() {
        _this.confirm(false);
        unbindProxyEvents();
      };
      _this.proxied.src = _this.element.src;
    };

    this.useCached = function(image) {
      if (image.isConfirmed) {
        _this.confirm(image.isLoaded);
      } else {
        image.one('confirm', function(image) {
          _this.confirm(image.isLoaded);
        });
      }
    };

    this.on = function(type, callback) {
      $(_this.element).on(type, callback);
    };

    this.one = function(type, callback) {
      $(_this.element).one(type, callback);
    };

    this.confirm = function(isLoaded) {
      _this.isConfirmed = true;
      _this.isLoaded = isLoaded;
      $(_this.element).trigger('confirm', _this);
    };
  };

  window.ThingsLoaded = ThingsLoaded;
}(window, jQuery));

