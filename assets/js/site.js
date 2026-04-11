(function () {
  'use strict';

  function onReady(callback) {
    if (typeof callback !== 'function') {
      return;
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function handleReady() {
        document.removeEventListener('DOMContentLoaded', handleReady);
        callback();
      });
      return;
    }

    callback();
  }

  function qs(selector, root) {
    return (root || document).querySelector(selector);
  }

  function qsa(selector, root) {
    return Array.from((root || document).querySelectorAll(selector));
  }

  function media(query) {
    return window.matchMedia(query);
  }

  window.Site = window.Site || {};
  window.Site.onReady = onReady;
  window.Site.qs = qs;
  window.Site.qsa = qsa;
  window.Site.media = media;
})();