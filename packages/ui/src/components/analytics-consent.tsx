'use client';

import { useEffect, useState, type ReactNode } from 'react';

const CONSENT_COOKIE = 'uk_cookie_consent';
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 180;

type ConsentChoice = 'accepted' | 'rejected';
type ConsentState = ConsentChoice | 'unset' | 'loading';

interface AnalyticsConsentProps {
  children: ReactNode;
}

function readConsentCookie(): ConsentChoice | null {
  const value = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${CONSENT_COOKIE}=`))
    ?.split('=')[1];

  return value === 'accepted' || value === 'rejected' ? value : null;
}

function writeConsentCookie(choice: ConsentChoice): void {
  const hostname = window.location.hostname;
  const sharedDomain =
    hostname === 'uploadkit.dev' || hostname.endsWith('.uploadkit.dev')
      ? '; Domain=.uploadkit.dev'
      : '';
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';

  document.cookie = `${CONSENT_COOKIE}=${choice}; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${sharedDomain}${secure}`;
}

function updateGoogleConsent(choice: ConsentChoice): void {
  const windowWithDataLayer = window as unknown as { dataLayer?: unknown[] };
  const dataLayer = (windowWithDataLayer.dataLayer ??= []);
  const storageValue = choice === 'accepted' ? 'granted' : 'denied';

  function gtag(
    _command: 'consent',
    _action: 'update',
    _parameters: Record<string, string>,
  ): void {
    // Google Consent Mode requires the function's arguments object on dataLayer.
    // eslint-disable-next-line prefer-rest-params
    dataLayer.push(arguments);
  }

  gtag('consent', 'update', {
    ad_storage: storageValue,
    ad_user_data: storageValue,
    ad_personalization: storageValue,
    analytics_storage: storageValue,
  });
}

export function AnalyticsConsent({ children }: AnalyticsConsentProps) {
  const [consent, setConsent] = useState<ConsentState>('loading');
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const storedConsent = readConsentCookie();
    if (storedConsent) updateGoogleConsent(storedConsent);
    setConsent(storedConsent ?? 'unset');
  }, []);

  function choose(nextConsent: ConsentChoice): void {
    const shouldReload = consent === 'accepted' && nextConsent === 'rejected';

    writeConsentCookie(nextConsent);
    updateGoogleConsent(nextConsent);
    setConsent(nextConsent);
    setSettingsOpen(false);

    // Removing a script node cannot undo third-party code that already ran.
    // Reloading guarantees GTM is absent after a user withdraws consent.
    if (shouldReload) window.location.reload();
  }

  if (consent === 'loading') return null;

  const showBanner = consent === 'unset' || settingsOpen;

  return (
    <>
      {consent === 'accepted' ? children : null}

      {showBanner ? (
        <section
          data-uk-cookie-consent="banner"
          role="region"
          aria-labelledby="cookie-consent-title"
          aria-describedby="cookie-consent-description"
        >
          <div className="uk-cookie-consent__inner">
            <div className="uk-cookie-consent__copy">
              <h2
                id="cookie-consent-title"
                className="uk-cookie-consent__title"
              >
                Your privacy, your choice
              </h2>
              <p
                id="cookie-consent-description"
                className="uk-cookie-consent__description"
              >
                We use optional analytics and advertising cookies to understand
                traffic and measure campaigns. Nothing optional loads unless you
                accept.
              </p>
            </div>
            <div className="uk-cookie-consent__actions">
              <button
                type="button"
                className="uk-cookie-consent__button uk-cookie-consent__button--secondary"
                onClick={() => choose('rejected')}
              >
                Reject optional
              </button>
              <button
                type="button"
                className="uk-cookie-consent__button uk-cookie-consent__button--primary"
                onClick={() => choose('accepted')}
              >
                Accept optional
              </button>
            </div>
          </div>
        </section>
      ) : (
        <button
          type="button"
          data-uk-cookie-consent="settings"
          onClick={() => setSettingsOpen(true)}
        >
          Cookie settings
        </button>
      )}
    </>
  );
}
