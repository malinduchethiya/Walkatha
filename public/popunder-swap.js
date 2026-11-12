(function () {
  if (window.__walkathawaPopunderSwapInstalled) return;
  window.__walkathawaPopunderSwapInstalled = true;

  var DEFAULT_AD_URL = 'https://asiaso.org/4/a42f0d62a73d3849fff5623bad9ff5dd';
  var REOPEN_STORAGE_KEY = 'walkathawa_reopened_story';
  var RATE_LIMIT_STORAGE_KEY = 'walkathawa_popunder_rate_v1';
  var MAX_REDIRECTS_PER_MINUTE = 2;
  var ONE_MINUTE_MS = 60 * 1000;

  var nativeOpen = window.open ? window.open.bind(window) : null;
  var nativeAnchorClick = HTMLAnchorElement.prototype.click;
  var nativeDispatchEvent = EventTarget.prototype.dispatchEvent;

  window.__adsterraCapturedAdUrl = DEFAULT_AD_URL;

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

  function getRecentRedirectTimestamps() {
    var now = Date.now();
    try {
      var raw = localStorage.getItem(RATE_LIMIT_STORAGE_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (ts) {
        return typeof ts === 'number' && now - ts < ONE_MINUTE_MS;
      });
    } catch (e) {
      return [];
    }
  }

  function canTriggerRedirectNow() {
    var recent = getRecentRedirectTimestamps();
    return recent.length < MAX_REDIRECTS_PER_MINUTE;
  }

  function recordRedirectTimestamp() {
    var recent = getRecentRedirectTimestamps();
    recent.push(Date.now());
    try {
      localStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(recent));
    } catch (e) {}
  }

  function executeStoryPageTabUnder(storyUrl, storySlug, explicitAdUrl) {
    if (!canTriggerRedirectNow()) {
      return false;
    }

    recordRedirectTimestamp();

    var targetStoryUrl = storyUrl || window.location.href;
    var adUrl = explicitAdUrl || window.__adsterraCapturedAdUrl || DEFAULT_AD_URL;

    try {
      localStorage.setItem(
        REOPEN_STORAGE_KEY,
        JSON.stringify({
          slug: storySlug || targetStoryUrl,
          ts: Date.now(),
        })
      );
    } catch (e) {}

    // 1. Open / reopen the story page in a new tab
    if (nativeOpen) {
      try {
        nativeOpen(targetStoryUrl, '_blank');
      } catch (e) {}
    }

    // 2. Turn the existing page into the ad redirection
    setTimeout(function () {
      try {
        window.location.assign(adUrl);
      } catch (e) {
        window.location.href = adUrl;
      }
    }, 15);

    return true;
  }

  window.__triggerStoryPopunderSwap = executeStoryPageTabUnder;
  window.__canTriggerPopunderSwap = canTriggerRedirectNow;

  function handleAdsterraAttempt(adUrl) {
    if (adUrl && adUrl !== 'about:blank' && !isSameOriginUrl(adUrl)) {
      window.__adsterraCapturedAdUrl = adUrl;
    }
    if (!window.__storyContentAlreadySwapped && canTriggerRedirectNow()) {
      window.__storyContentAlreadySwapped = true;
      executeStoryPageTabUnder(window.location.href, window.location.pathname, adUrl);
    }
  }

  function createFakePopupWindow(initialAdUrl) {
    var locObj = {
      _href: initialAdUrl || 'about:blank',
      assign: function (u) {
        this._href = String(u || '');
        if (this._href && this._href !== 'about:blank') {
          handleAdsterraAttempt(this._href);
        }
      },
      replace: function (u) {
        this._href = String(u || '');
        if (this._href && this._href !== 'about:blank') {
          handleAdsterraAttempt(this._href);
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
          handleAdsterraAttempt(this._href);
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
          if (m && m[1]) handleAdsterraAttempt(m[1]);
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
          handleAdsterraAttempt(str);
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
    handleAdsterraAttempt(strUrl);
    return createFakePopupWindow(strUrl);
  };

  HTMLAnchorElement.prototype.click = function () {
    var href = this.href || this.getAttribute('href') || '';
    if (href && !isSameOriginUrl(href) && !isAllowedExternalUserLink(href)) {
      handleAdsterraAttempt(href);
      return;
    }
    return nativeAnchorClick.apply(this, arguments);
  };

  EventTarget.prototype.dispatchEvent = function (evt) {
    if (evt && evt.type === 'click' && this && this.tagName === 'A') {
      var href = this.href || (this.getAttribute && this.getAttribute('href')) || '';
      if (href && !isSameOriginUrl(href) && !isAllowedExternalUserLink(href)) {
        handleAdsterraAttempt(href);
        return true;
      }
    }
    return nativeDispatchEvent.apply(this, arguments);
  };
})();
