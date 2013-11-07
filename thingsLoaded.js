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
    var self = this;

    this.images = [];
    this.checkedCount = 0;
    this.hasAnyBroken = false;

    this.deferred = new $.Deferred();

    this.add = function(element) {
      self.images.push(new ThingsLoaded.LoadingImage(element));
    };

    this.addWithSelector = function(selector) {
      $(selector).find('img').each(function(k, v) {
        self.add(v);
      });
    };

    this.run = function() {
      if (!self.images.length) {
        self.complete();
        return self.deferred;
      }

      var onConfirm = function(image) {
        self.progress(image);
        self.checkedCount++;

        if (self.checkedCount === self.images.length) {
          self.complete();
        }
      };

      for (var i=0; i < self.images.length; i++) {
        var loadingImage = self.images[i];

        loadingImage.one('confirm', onConfirm);
        loadingImage.check();
      }

      return self.deferred;
    };

    this.progress = function(image) {
      self.hasAnyBroken = self.hasAnyBroken || !image.isLoaded;

      setTimeout(function() {
        // HACK - Chrome triggers event before object properties have changed. #83
        self.deferred.notify(self, image);
      });
    };

    this.complete = function() {
      self.isComplete = true;

      setTimeout(function() {
        // HACK - another setTimeout so that confirm happens after progress

        if (self.hasAnyBroken) {
          self.deferred.reject(self);
        } else {
          self.deferred.resolve(self);
        }
      });
    };
  };

  ThingsLoaded.cachedLoadingImages = {};

  ThingsLoaded.LoadingImage = function(element) {
    var self = this;

    this.element = element;
    this.proxied = undefined;

    this.check = function() {
      // First check cached any previous images that have same src.
      var image = ThingsLoaded.cachedLoadingImages[self.element.src];
      if (image) {
        self.useCached(image);
        return;
      }

      // Add this to cache.
      ThingsLoaded.cachedLoadingImages[self.element.src] = self;

      // If complete is true and browser supports natural sizes,
      // try to check for image status manually.
      if (self.element.complete && self.element.naturalWidth !== undefined ) {
        self.confirm(self.element.naturalWidth !== 0);
        return;
      }

      // If none of the checks above matched, simulate loading
      // on detached element.
      var unbindProxyEvents = function() {
        self.proxied.onload = null;
        self.proxied.onerror = null;
      };

      self.proxied = new Image();
      self.proxied.onload = function() {
        self.confirm(true);
        unbindProxyEvents();
      };
      self.proxied.onerror = function() {
        self.confirm(false);
        unbindProxyEvents();
      };
      self.proxied.src = self.element.src;
    };

    this.useCached = function(image) {
      if (image.isConfirmed) {
        self.confirm(image.isLoaded);
      } else {
        image.one('confirm', function(image) {
          self.confirm(image.isLoaded);
        });
      }
    };

    this.on = function(type, callback) {
      $(self.element).on(type, callback);
    };

    this.one = function(type, callback) {
      $(self.element).one(type, callback);
    };

    this.confirm = function(isLoaded) {
      self.isConfirmed = true;
      self.isLoaded = isLoaded;
      $(self.element).trigger('confirm', self);
    };
  };

  window.ThingsLoaded = ThingsLoaded;
}(window, jQuery));

