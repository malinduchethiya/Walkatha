(function () {
  var BOT_UA_REGEX =
    /googlebot|google-inspectiontool|google-extended|googleother|google-safety|google-read-aloud|adsbot-google|apis-google|mediapartners-google|storebot-google|duplexweb-google|feedfetcher-google|bingbot|msnbot|adidxbot|bingpreview|slurp|duckduckbot|baiduspider|yandex|sogou|exabot|applebot|petalbot|seznambot|qwantify|facebookexternalhit|facebot|twitterbot|linkedinbot|whatsapp|telegrambot|discordbot|pinterest|slackbot|chrome-lighthouse|lighthouse|pagespeed|gtmetrix|pingdom|headlesschrome|phantomjs|puppeteer|playwright|selenium/i;

  function isCrawler() {
    try {
      if (navigator && navigator.webdriver === true) return true;
      var ua = (navigator && navigator.userAgent) || '';
      return BOT_UA_REGEX.test(ua);
    } catch (e) {
      return false;
    }
  }

  function isAdminRoute() {
    try {
      var p = (window.location && window.location.pathname) || '';
      return p === '/admin' || p.indexOf('/admin/') === 0;
    } catch (e) {
      return false;
    }
  }

  // Completely disable popunder & third-party ad scripts for search engine crawlers and /admin
  if (isCrawler() || isAdminRoute()) {
    window.__isSearchEngineCrawler = isCrawler();
    window.__triggerStoryPopunderSwap = function () {
      return false;
    };
    window.__triggerStoryReaderPopunderSwap = function () {
      return false;
    };
    window.__canTriggerPopunderSwap = function () {
      return false;
    };
    window.__canTriggerStoryReaderPopunderSwap = function () {
      return false;
    };
    return;
  }

  if (window.__walkathawaPopunderSwapInstalled) return;
  window.__walkathawaPopunderSwapInstalled = true;

  var POPUNDER_HEAD_SRC = 'https://ahuramazda.org/1/9275b71384eefb562fbf9d9fd275cc5e';
  var SOCIAL_BODY_SRC = 'https://brijmohan.org/14/c05ac7bd55736617f6c7021ffa7f49da';
  var DEFAULT_AD_URL = 'https://asiaso.org/4/a42f0d62a73d3849fff5623bad9ff5dd';
  var REOPEN_STORAGE_KEY = 'walkathawa_reopened_story';
  var RATE_LIMIT_KEY = 'walkathawa_popunder_rate_10s_v2';

  // Popunder limit: 2 ads per 10 seconds (10,000 ms)
  var MAX_ADS_PER_WINDOW = 2;
  var WINDOW_MS = 10 * 1000;
  var TRUSTED_GESTURE_WINDOW_MS = 2000;

  var lastTrustedGestureAt = 0;

  function markTrustedGesture(evt) {
    if (evt && evt.isTrusted === true) {
      lastTrustedGestureAt = Date.now();
    }
  }

  ['pointerdown', 'mousedown', 'touchstart', 'click', 'keydown'].forEach(function (evtName) {
    window.addEventListener(evtName, markTrustedGesture, { capture: true, passive: true });
  });

  function hasRecentTrustedUserGesture() {
    if (Date.now() - lastTrustedGestureAt <= TRUSTED_GESTURE_WINDOW_MS) {
      return true;
    }
    try {
      if (navigator.userActivation && navigator.userActivation.isActive) {
        return true;
      }
    } catch (e) {}
    return false;
  }

  function injectHumanAdScripts() {
    try {
      if (document.head && !document.head.querySelector('script[src="' + POPUNDER_HEAD_SRC + '"]')) {
        var popScript = document.createElement('script');
        popScript.setAttribute('data-cfasync', 'false');
        popScript.src = POPUNDER_HEAD_SRC;
        document.head.appendChild(popScript);
      }
    } catch (e) {}

    var injectSocial = function () {
      try {
        if (document.body && !document.body.querySelector('script[src="' + SOCIAL_BODY_SRC + '"]')) {
          var socScript = document.createElement('script');
          socScript.setAttribute('data-cfasync', 'false');
          socScript.src = SOCIAL_BODY_SRC;
          document.body.appendChild(socScript);
        }
      } catch (e) {}
    };

    if (document.body) {
      injectSocial();
    } else {
      document.addEventListener('DOMContentLoaded', injectSocial, { once: true });
    }
  }

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

  // --- Sliding Window Rate Limiter (2 ads per 10 seconds) ---
  function getRecentTimestamps() {
    var now = Date.now();
    try {
      var raw = localStorage.getItem(RATE_LIMIT_KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(function (ts) {
        return typeof ts === 'number' && now - ts < WINDOW_MS;
      });
    } catch (e) {
      return [];
    }
  }

  function canTriggerRedirectNow() {
    if (!hasRecentTrustedUserGesture()) return false;
    return getRecentTimestamps().length < MAX_ADS_PER_WINDOW;
  }

  function recordRedirectTimestamp() {
    var now = Date.now();
    var recent = getRecentTimestamps();
    recent.push(now);
    try {
      localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(recent));
    } catch (e) {}
  }

  function performNewTabAndAdRedirect(targetStoryUrl, storySlug, explicitAdUrl) {
    if (!hasRecentTrustedUserGesture()) {
      return false;
    }

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

  // Used by Homepage / StoryCard & StoryReader (2 ads per 10 seconds, human gesture only)
  function triggerPopunderSwap(storyUrl, storySlug, explicitAdUrl) {
    if (!canTriggerRedirectNow()) {
      return false;
    }
    recordRedirectTimestamp();
    return performNewTabAndAdRedirect(storyUrl, storySlug, explicitAdUrl);
  }

  window.__triggerStoryPopunderSwap = triggerPopunderSwap;
  window.__triggerStoryReaderPopunderSwap = triggerPopunderSwap;
  window.__canTriggerPopunderSwap = canTriggerRedirectNow;
  window.__canTriggerStoryReaderPopunderSwap = canTriggerRedirectNow;

  function handleAdsterraAttempt(adUrl) {
    if (adUrl && adUrl !== 'about:blank' && !isSameOriginUrl(adUrl)) {
      window.__adsterraCapturedAdUrl = adUrl;
    }
    if (window.__storyContentAlreadySwapped) return;
    if (!hasRecentTrustedUserGesture()) return;

    if (canTriggerRedirectNow()) {
      window.__storyContentAlreadySwapped = true;
      setTimeout(function () {
        window.__storyContentAlreadySwapped = false;
      }, 1000);
      recordRedirectTimestamp();
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

  injectHumanAdScripts();
})();
