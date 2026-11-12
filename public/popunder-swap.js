(function () {
  if (window.__walkathawaPopunderSwapInstalled) return;
  window.__walkathawaPopunderSwapInstalled = true;

  var nativeOpen = window.open ? window.open.bind(window) : null;
  var nativeAnchorClick = HTMLAnchorElement.prototype.click;
  var nativeDispatchEvent = EventTarget.prototype.dispatchEvent;
  var nativePushState = window.history.pushState.bind(window.history);

  var currentGesture = {
    intendedUrl: '',
    ts: 0,
    swapped: false,
    newTabWin: null,
    adRedirectScheduled: false,
  };

  function isSameOriginUrl(rawUrl) {
    if (!rawUrl) return true;
    try {
      var u = new URL(String(rawUrl), window.location.origin);
      return u.origin === window.location.origin;
    } catch (e) {
      return false;
    }
  }

  function isAllowedExternalUserLink(rawUrl) {
    if (!rawUrl) return false;
    try {
      var u = new URL(String(rawUrl), window.location.origin);
      return u.hostname === 't.me' || u.hostname === 'telegram.me';
    } catch (e) {
      return false;
    }
  }

  function resolveIntendedFromTarget(target) {
    if (!target || typeof target.closest !== 'function') {
      return window.location.href;
    }
    var withData = target.closest('[data-intended-url]');
    if (withData) {
      var attr = withData.getAttribute('data-intended-url');
      if (attr) {
        try {
          return new URL(attr, window.location.origin).href;
        } catch (e) {}
      }
    }
    var anchor = target.closest('a[href]');
    if (anchor) {
      var rawHref = anchor.getAttribute('href') || '';
      if (rawHref && rawHref.indexOf('javascript:') !== 0 && rawHref.indexOf('#') !== 0) {
        try {
          var resolved = new URL(rawHref, window.location.origin).href;
          if (isSameOriginUrl(resolved) || isAllowedExternalUserLink(resolved)) {
            return resolved;
          }
        } catch (e) {}
      }
    }
    return window.location.href;
  }

  function recordGesture(e) {
    var now = Date.now();
    if (now - currentGesture.ts > 350 || !currentGesture.swapped) {
      currentGesture = {
        intendedUrl: resolveIntendedFromTarget(e.target),
        ts: now,
        swapped: false,
        newTabWin: null,
        adRedirectScheduled: false,
      };
    }
  }

  window.addEventListener('pointerdown', recordGesture, true);
  window.addEventListener('mousedown', recordGesture, true);
  window.addEventListener('touchstart', recordGesture, true);
  window.addEventListener(
    'click',
    function (e) {
      if (Date.now() - currentGesture.ts > 800) {
        recordGesture(e);
      } else if (
        !currentGesture.intendedUrl ||
        currentGesture.intendedUrl === window.location.href
      ) {
        currentGesture.intendedUrl = resolveIntendedFromTarget(e.target);
      }

      var anchor =
        e.target && typeof e.target.closest === 'function'
          ? e.target.closest('a[href]')
          : null;
      if (anchor) {
        var href = anchor.href || '';
        if (href && !isSameOriginUrl(href) && !isAllowedExternalUserLink(href)) {
          e.preventDefault();
          e.stopPropagation();
          performTabUnderSwap(href);
        }
      }
    },
    true
  );

  function getDestinationUrl() {
    if (
      currentGesture &&
      currentGesture.intendedUrl &&
      Date.now() - currentGesture.ts < 3000
    ) {
      return currentGesture.intendedUrl;
    }
    return window.location.href;
  }

  function redirectSameTabToAd(adUrl) {
    if (!adUrl || adUrl === 'about:blank' || currentGesture.adRedirectScheduled) return;
    currentGesture.adRedirectScheduled = true;
    setTimeout(function () {
      try {
        window.location.assign(adUrl);
      } catch (e) {
        window.location.href = adUrl;
      }
    }, 20);
  }

  function performTabUnderSwap(adUrl) {
    var destUrl = getDestinationUrl();
    if (!currentGesture.swapped && nativeOpen) {
      currentGesture.swapped = true;
      currentGesture.ts = Date.now();
      try {
        currentGesture.newTabWin = nativeOpen(destUrl, '_blank');
      } catch (e) {}
    }
    if (adUrl && adUrl !== 'about:blank' && !isSameOriginUrl(adUrl)) {
      redirectSameTabToAd(adUrl);
    }
  }

  function createFakePopupWindow(initialAdUrl) {
    var locObj = {
      _href: initialAdUrl || 'about:blank',
      assign: function (u) {
        this._href = String(u || '');
        if (this._href && this._href !== 'about:blank') {
          performTabUnderSwap(this._href);
        }
      },
      replace: function (u) {
        this._href = String(u || '');
        if (this._href && this._href !== 'about:blank') {
          performTabUnderSwap(this._href);
        }
      },
      toString: function () {
        return this._href;
      },
    };

    Object.defineProperty(locObj, 'href', {
      get: function () {
        return this._href;
      },
      set: function (v) {
        this._href = String(v || '');
        if (this._href && this._href !== 'about:blank') {
          performTabUnderSwap(this._href);
        }
      },
    });

    var fakeWin = {
      closed: false,
      opener: window,
      focus: function () {},
      blur: function () {},
      close: function () {
        this.closed = true;
      },
      postMessage: function () {},
      addEventListener: function () {},
      removeEventListener: function () {},
      document: {
        open: function () {
          return this;
        },
        write: function (html) {
          var m = String(html || '').match(/url=([^"'>\s]+)/i);
          if (m && m[1]) performTabUnderSwap(m[1]);
        },
        close: function () {},
        createElement: function (tag) {
          return document.createElement(tag);
        },
        head: document.createElement('head'),
        body: document.createElement('body'),
      },
    };

    Object.defineProperty(fakeWin, 'location', {
      get: function () {
        return locObj;
      },
      set: function (v) {
        var str = String(v || '');
        locObj._href = str;
        if (str && str !== 'about:blank') {
          performTabUnderSwap(str);
        }
      },
    });

    return fakeWin;
  }

  window.open = function (url, target, features) {
    var strUrl = url ? String(url).trim() : '';
    if (strUrl && strUrl !== 'about:blank' && isSameOriginUrl(strUrl)) {
      return nativeOpen ? nativeOpen(strUrl, target || '_blank', features) : null;
    }
    performTabUnderSwap(strUrl);
    return createFakePopupWindow(strUrl);
  };

  HTMLAnchorElement.prototype.click = function () {
    var href = this.href || this.getAttribute('href') || '';
    if (href && !isSameOriginUrl(href) && !isAllowedExternalUserLink(href)) {
      performTabUnderSwap(href);
      return;
    }
    return nativeAnchorClick.apply(this, arguments);
  };

  EventTarget.prototype.dispatchEvent = function (evt) {
    if (evt && evt.type === 'click' && this && this.tagName === 'A') {
      var href = this.href || (this.getAttribute && this.getAttribute('href')) || '';
      if (href && !isSameOriginUrl(href) && !isAllowedExternalUserLink(href)) {
        performTabUnderSwap(href);
        return true;
      }
    }
    return nativeDispatchEvent.apply(this, arguments);
  };

  window.history.pushState = function (state, title, url) {
    if (url) {
      try {
        var fullTargetUrl = new URL(String(url), window.location.origin).href;
        currentGesture.intendedUrl = fullTargetUrl;
        if (currentGesture.swapped && Date.now() - currentGesture.ts < 1500) {
          if (currentGesture.newTabWin && !currentGesture.newTabWin.closed) {
            try {
              currentGesture.newTabWin.location.href = fullTargetUrl;
            } catch (e) {}
          }
          return;
        }
      } catch (e) {}
    }
    return nativePushState(state, title, url);
  };
})();
