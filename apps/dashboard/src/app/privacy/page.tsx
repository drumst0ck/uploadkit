import type { Metadata } from 'next';
import { LegalPage } from '../../components/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy | UploadKit',
  description: 'Learn how UploadKit collects, uses, stores, and protects personal information.',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="This policy explains what information UploadKit collects, why we collect it, and the choices you have when using our websites, dashboard, APIs, SDKs, and file services."
    >
      <section>
        <h2>1. Scope</h2>
        <p>
          This Privacy Policy applies to services operated by UploadKit, including uploadkit.dev and its
          subdomains (the “Services”). It does not govern files or personal information that our customers
          upload and process through the Services on behalf of their own users. For that data, the customer
          is the controller or business and UploadKit acts as its processor or service provider.
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <h3>Information you provide</h3>
        <ul>
          <li>Account details, such as your name, email address, and authentication provider identifier.</li>
          <li>Project settings, team membership, support requests, and other communications.</li>
          <li>Billing details. Payment card information is collected and processed by Stripe, not stored by UploadKit.</li>
          <li>Files, metadata, and configuration you submit when using managed storage.</li>
        </ul>
        <h3>Information collected automatically</h3>
        <ul>
          <li>Usage data, including API requests, uploads, bandwidth, storage, errors, and feature interactions.</li>
          <li>Device and connection data, such as IP address, browser type, operating system, and timestamps.</li>
          <li>Cookies and similar technologies. Optional analytics or advertising cookies are disabled until you consent.</li>
        </ul>
      </section>

      <section>
        <h2>3. How we use information</h2>
        <p>We use information to provide, secure, maintain, and improve the Services; authenticate users; process payments; measure usage; prevent abuse; communicate service updates; answer support requests; and comply with legal obligations. We do not sell personal information.</p>
      </section>

      <section>
        <h2>4. Legal bases</h2>
        <p>If you are in the European Economic Area, United Kingdom, or another jurisdiction that requires a legal basis, we process personal information as necessary to perform our contract with you, pursue legitimate interests such as security and service improvement, comply with law, or based on your consent. You may withdraw consent at any time.</p>
      </section>

      <section>
        <h2>5. How we share information</h2>
        <p>We share information only as needed with infrastructure, storage, authentication, email, analytics, error-monitoring, and payment providers that help operate the Services. These providers may process information only under our instructions and contractual safeguards. We may also disclose information when required by law, to protect rights and safety, during a corporate transaction, or with your direction.</p>
      </section>

      <section>
        <h2>6. Customer content and Bring Your Own Storage</h2>
        <p>In managed-storage mode, customer files are stored using Cloudflare R2. In Bring Your Own Storage mode, files are uploaded directly to the storage provider configured by the customer. Storage credentials are encrypted and used server-side to authorize requests; they are never intentionally exposed to the browser. Customers are responsible for providing notices and obtaining permissions required for the content they upload.</p>
      </section>

      <section>
        <h2>7. Retention and deletion</h2>
        <p>We retain account information while your account is active and as reasonably necessary for billing, security, dispute resolution, and legal compliance. Customer files remain until deleted by an authorized user, removed under an applicable lifecycle policy, or deleted following account closure, subject to limited backup retention.</p>
      </section>

      <section>
        <h2>8. Security and international transfers</h2>
        <p>We use administrative, technical, and organizational safeguards designed to protect information, including encryption in transit, restricted access, and credential protection. No system is completely secure. Our providers may process information in countries other than yours; where required, we rely on recognized transfer safeguards.</p>
      </section>

      <section>
        <h2>9. Your rights and choices</h2>
        <p>Depending on your location, you may have rights to access, correct, delete, restrict, object to, or receive a portable copy of your personal information, and to appeal or complain to a supervisory authority. You can manage optional cookies through the cookie settings control. To exercise a privacy right, email us at <a href="mailto:privacy@uploadkit.dev">privacy@uploadkit.dev</a>. We may need to verify your identity.</p>
      </section>

      <section>
        <h2>10. Children</h2>
        <p>The Services are not directed to children under 13, or the minimum age required by local law. We do not knowingly collect personal information from children.</p>
      </section>

      <section>
        <h2>11. Changes and contact</h2>
        <p>We may update this policy as the Services or applicable law changes. We will post the revised policy here and update its effective date. For questions or requests, contact <a href="mailto:privacy@uploadkit.dev">privacy@uploadkit.dev</a>.</p>
      </section>
    </LegalPage>
  );
}
