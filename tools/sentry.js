(function() {
  'use strict';

  const SENTRY_DSN = 'https://c7d88b71f550a276f973885a44b6536d@o4510511576055808.ingest.de.sentry.io/4510511935193168';
  let sentryInitialized = false;

  async function isErrorReportingEnabled() {
    try {
      const result = await chrome.storage.sync.get('firka_errorReporting');
      return result.firka_errorReporting !== false;
    } catch (error) {
      return true;
    }
  }

  async function initSentry() {
    if (sentryInitialized) {
      return;
    }

    const enabled = await isErrorReportingEnabled();

    if (!enabled) {
      return;
    }

    setTimeout(() => {
      configureSentry();
    }, 100);
  }

  function configureSentry() {
    try {
      const SentrySDK = window.Sentry || (typeof Sentry !== 'undefined' ? Sentry : null);

      if (!SentrySDK) {
        setTimeout(configureSentry, 500);
        return;
      }

      if (!SentrySDK.init) {
        return;
      }

      const manifest = chrome.runtime.getManifest();

      SentrySDK.init({
        dsn: SENTRY_DSN,
        release: `firka-extension@${manifest.version}`,
        environment: 'production',
        integrations: [],
        beforeSend(event, hint) {
          if (event.request) {
            delete event.request.cookies;
            delete event.request.headers;
          }
          return event;
        },
      });

      sentryInitialized = true;
    } catch (error) {
    }
  }

  window.addEventListener('error', function(event) {
    if (sentryInitialized) {
      const SentrySDK = window.Sentry || (typeof Sentry !== 'undefined' ? Sentry : null);
      if (SentrySDK && SentrySDK.captureException) {
        SentrySDK.captureException(event.error || new Error(event.message));
      } else {
        console.warn('[Sentry] SDK not available for capturing');
      }
    } else {
      console.warn('[Sentry] Not initialized yet, cannot capture error');
    }
  }, true);

  window.addEventListener('unhandledrejection', function(event) {
    if (sentryInitialized) {
      const SentrySDK = window.Sentry || (typeof Sentry !== 'undefined' ? Sentry : null);
      if (SentrySDK && SentrySDK.captureException) {
        SentrySDK.captureException(event.reason);
      }
    }
  }, true);

  if (typeof chrome !== 'undefined' && chrome.storage) {
    chrome.storage.onChanged.addListener(function(changes, namespace) {
      if (namespace === 'sync' && changes.firka_errorReporting) {
        const newValue = changes.firka_errorReporting.newValue;

        if (newValue === false && sentryInitialized) {
          if (typeof Sentry !== 'undefined' && Sentry.close) {
            Sentry.close();
            sentryInitialized = false;
          }
        } else if (newValue !== false && !sentryInitialized) {
          initSentry();
        }
      }
    });
  }

  window.FirkaSentry = {
    init: initSentry,
    isEnabled: isErrorReportingEnabled,
    captureException: function(error) {
      if (sentryInitialized) {
        const SentrySDK = window.Sentry || (typeof Sentry !== 'undefined' ? Sentry : null);
        if (SentrySDK && SentrySDK.captureException) {
          SentrySDK.captureException(error);
        }
      }
    },
    captureMessage: function(message, level = 'info') {
      if (sentryInitialized) {
        const SentrySDK = window.Sentry || (typeof Sentry !== 'undefined' ? Sentry : null);
        if (SentrySDK && SentrySDK.captureMessage) {
          SentrySDK.captureMessage(message, level);
        }
      }
    }
  };

  initSentry();
})();
