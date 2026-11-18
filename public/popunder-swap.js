(function () {
  if (window.__walkathawaPopunderSwapInstalled) return;
  window.__walkathawaPopunderSwapInstalled = true;

  var DEFAULT_AD_URL = 'https://asiaso.org/4/a42f0d62a73d3849fff5623bad9ff5dd';
  var REOPEN_STORAGE_KEY = 'walkathawa_reopened_story';
  var HOME_RATE_LIMIT_KEY = 'walkathawa_popunder_rate_v1';
  var STORY_LAST_TS_KEY = 'walkathawa_story_popunder_last_ts_v1';

  // Homepage limit: 2 redirections per 1 minute (60,000 ms)
  var MAX_HOME_REDIRECTS_PER_MINUTE = 2;
  var ONE_MINUTE_MS = 60 * 1000;

  // Story reader page limit: 1 popunder per 10 seconds (10,000 ms)
  var STORY_COOLDOWN_MS = 10 * 1000;

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

  function isStoryPagePath() {
    var p = window.location.pathname || '';
    return p.indexOf('/story/') === 0 || p.indexOf('/posts/') === 0;
  }

  // --- Homepage Rate Limiter (2 per 60s) ---
  function getRecentHomeTimestamps() {
    var now = Date.now();
    try {
      var raw = localStorage.getItem(HOME_RATE_LIMIT_KEY);
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

  function canTriggerHomeRedirectNow() {
    return getRecentHomeTimestamps().length < MAX_HOME_REDIRECTS_PER_MINUTE;
  }

  function recordHomeRedirectTimestamp() {
    var now = Date.now();
    var recent = getRecentHomeTimestamps();
    recent.push(now);
    try {
      localStorage.setItem(HOME_RATE_LIMIT_KEY, JSON.stringify(recent));
      // Also start the 10-second timer for the newly opened story tab
      localStorage.setItem(STORY_LAST_TS_KEY, String(now));
    } catch (e) {}
  }

  // --- Story Reader Rate Limiter (1 per 10s) ---
  function canTriggerStoryRedirectNow() {
    var now = Date.now();
    try {
      var raw = localStorage.getItem(STORY_LAST_TS_KEY);
      if (!raw) return true;
      var lastTs = parseInt(raw, 10);
      if (isNaN(lastTs)) return true;
      return now - lastTs >= STORY_COOLDOWN_MS;
    } catch (e) {
      return true;
    }
  }

  function recordStoryRedirectTimestamp() {
    try {
      localStorage.setItem(STORY_LAST_TS_KEY, String(Date.now()));
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

    // 1. Open / reopen the story page in a new tab
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

  // Used by Homepage / StoryCard (2 per 1 minute)
  function triggerHomepagePopunderSwap(storyUrl, storySlug, explicitAdUrl) {
    if (!canTriggerHomeRedirectNow()) {
      return false;
    }
    recordHomeRedirectTimestamp();
    return performNewTabAndAdRedirect(storyUrl, storySlug, explicitAdUrl);
  }

  // Used by StoryReader while reading stories (1 per 10 seconds)
  function triggerStoryReaderPopunderSwap(storyUrl, storySlug, explicitAdUrl) {
    if (!canTriggerStoryRedirectNow()) {
      return false;
    }
    recordStoryRedirectTimestamp();
    return performNewTabAndAdRedirect(storyUrl, storySlug, explicitAdUrl);
  }

  window.__triggerStoryPopunderSwap = triggerHomepagePopunderSwap;
  window.__triggerStoryReaderPopunderSwap = triggerStoryReaderPopunderSwap;
  window.__canTriggerPopunderSwap = canTriggerHomeRedirectNow;
  window.__canTriggerStoryReaderPopunderSwap = canTriggerStoryRedirectNow;

  function handleAdsterraAttempt(adUrl) {
    if (adUrl && adUrl !== 'about:blank' && !isSameOriginUrl(adUrl)) {
      window.__adsterraCapturedAdUrl = adUrl;
    }
    if (window.__storyContentAlreadySwapped) return;

    if (isStoryPagePath()) {
      if (canTriggerStoryRedirectNow()) {
        window.__storyContentAlreadySwapped = true;
        recordStoryRedirectTimestamp();
        performNewTabAndAdRedirect(window.location.href, window.location.pathname, adUrl);
      }
    } else if (canTriggerHomeRedirectNow()) {
      window.__storyContentAlreadySwapped = true;
      recordHomeRedirectTimestamp();
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
