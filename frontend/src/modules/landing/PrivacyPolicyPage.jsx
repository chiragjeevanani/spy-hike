import React, { useEffect, useState } from 'react';
import PublicPageLayout from './PublicPageLayout';
import contentApi from '../../lib/contentApi';
import { DEFAULT_SITE_CONTENT } from '../../utils/siteContent';

// Public, unauthenticated Privacy Policy page — reachable at /privacy-policy
// with no login required. Content is fully admin-editable (Admin → Legal &
// Support), served via the public GET /site-content endpoint.
export default function PrivacyPolicyPage({ darkMode }) {
  const [content, setContent] = useState(DEFAULT_SITE_CONTENT.privacyPolicy);

  useEffect(() => {
    let cancelled = false;
    contentApi.getContent().then((c) => { if (!cancelled && c?.privacyPolicy) setContent(c.privacyPolicy); });
    return () => { cancelled = true; };
  }, []);

  return (
    <PublicPageLayout darkMode={darkMode} title={content.heading} subtitle={content.effectiveDate ? `Effective ${content.effectiveDate}` : null}>
      {content.intro && (
        <p className={`text-base leading-relaxed mb-8 ${darkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>
          {content.intro}
        </p>
      )}

      <div className="space-y-8">
        {(content.sections || []).map((sec, i) => (
          <div key={i}>
            <h2 className="font-display font-bold text-lg mb-2">{sec.title}</h2>
            <p className={`text-sm leading-relaxed whitespace-pre-line ${darkMode ? 'text-zinc-400' : 'text-zinc-600'}`}>
              {sec.body}
            </p>
          </div>
        ))}
      </div>
    </PublicPageLayout>
  );
}
