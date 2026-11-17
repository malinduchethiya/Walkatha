(function () {
  if (window.__walkathawaPopunderSwapInstalled) return;
  window.__walkathawaPopunderSwapInstalled = true;

  var DEFAULT_AD_URL = 'https://asiaso.org/4/a42f0d62a73d3849fff5623bad9ff5dd';
  var REOPEN_STORAGE_KEY = 'walkathawa_reopened_story';
  var POPUNDER_LAST_TS_KEY = 'walkathawa_story_popunder_last_ts_v1';

  // Popunder limit: 1 ad per 5 seconds (5,000 ms)
  var POPUNDER_COOLDOWN_MS = 5 * 1000;

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

  // --- Rate Limiter: 1 popunder per 5 seconds (5,000 ms) ---
  function canTriggerPopunderRedirectNow() {
    var now = Date.now();
    try {
      var raw = localStorage.getItem(POPUNDER_LAST_TS_KEY);
      if (!raw) return true;
      var lastTs = parseInt(raw, 10);
      if (isNaN(lastTs)) return true;
      return now - lastTs >= POPUNDER_COOLDOWN_MS;
    } catch (e) {
      return true;
    }
  }

  function recordPopunderRedirectTimestamp() {
    try {
      localStorage.setItem(POPUNDER_LAST_TS_KEY, String(Date.now()));
    } catch (e) {}
  }

  function performNewTabAndAdRedirect(targetStoryUrl, storySlug, explicitAdUrl) {
    var destUrl = targetStoryUrl || window.location.href;
    var adUrl = explicitAdUrl || window.__adsterraCapturedAdUrl || DEFAULT_AD_URL;

    try {
      localStorage.setItem(
        REOPEN_STORAGE_KEY,
        JSON.stringify({
          slug: storySlug || destUrl,
          scrollY: typeof window.scrollY === 'number' ? window.scrollY : 0,
          ts: Date.now(),
        })
      );
    } catch (e) {}

    // 1. Open / reopen the target page in a new tab
    if (nativeOpen) {
      try {
        nativeOpen(destUrl, '_blank');
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

  // Used by Homepage / StoryCard & StoryReader (1 ad per 5 seconds)
  function triggerPopunderSwap(storyUrl, storySlug, explicitAdUrl) {
    if (!canTriggerPopunderRedirectNow()) {
      return false;
    }
    recordPopunderRedirectTimestamp();
    return performNewTabAndAdRedirect(storyUrl, storySlug, explicitAdUrl);
  }

  window.__triggerStoryPopunderSwap = triggerPopunderSwap;
  window.__triggerStoryReaderPopunderSwap = triggerPopunderSwap;
  window.__canTriggerPopunderSwap = canTriggerPopunderRedirectNow;
  window.__canTriggerStoryReaderPopunderSwap = canTriggerPopunderRedirectNow;

  function handleAdsterraAttempt(adUrl) {
    if (adUrl && adUrl !== 'about:blank' && !isSameOriginUrl(adUrl)) {
      window.__adsterraCapturedAdUrl = adUrl;
    }
    if (window.__storyContentAlreadySwapped) return;

    if (canTriggerPopunderRedirectNow()) {
      window.__storyContentAlreadySwapped = true;
      setTimeout(function () {
        window.__storyContentAlreadySwapped = false;
      }, 1000);
      recordPopunderRedirectTimestamp();
      performNewTabAndAdRedirect(window.location.href, window.location.pathname, adUrl);
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
