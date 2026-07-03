import type { Metadata } from 'next';
import { LegalPage } from '../../components/legal-page';

export const metadata: Metadata = {
  title: 'Terms of Service | UploadKit',
  description: 'The terms that govern your use of UploadKit services.',
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      description="These Terms govern access to and use of UploadKit’s websites, dashboard, APIs, SDKs, storage, CDN, and related services. By using the Services, you agree to them."
    >
      <section>
        <h2>1. Eligibility and accounts</h2>
        <p>You must be legally able to enter into these Terms and be at least 18 years old, or the age of majority where you live. You are responsible for accurate account information, safeguarding credentials and API keys, and all activity under your account. Notify us promptly of suspected unauthorized access.</p>
      </section>

      <section>
        <h2>2. The Services</h2>
        <p>UploadKit provides developer tools for uploading, storing, transforming, managing, and delivering files. Features may include managed Cloudflare R2 storage and Bring Your Own Storage (“BYOS”). We may improve or modify the Services over time. Material reductions to paid functionality will be communicated when reasonably practicable.</p>
      </section>

      <section>
        <h2>3. Customer content</h2>
        <p>You retain ownership of files, code, data, and other content you submit (“Customer Content”). You grant UploadKit a limited, worldwide license to host, copy, transmit, transform, and otherwise process Customer Content solely to provide, secure, and improve the Services. You represent that you have all rights and permissions needed for Customer Content and its processing.</p>
      </section>

      <section>
        <h2>4. Acceptable use</h2>
        <p>You may not use the Services to:</p>
        <ul>
          <li>Violate law, intellectual property, privacy, publicity, or other rights.</li>
          <li>Upload malware or content intended to disrupt, damage, or gain unauthorized access to systems.</li>
          <li>Distribute child sexual abuse material, non-consensual intimate imagery, or content that facilitates exploitation.</li>
          <li>Evade usage limits, probe for vulnerabilities without authorization, or interfere with other customers.</li>
          <li>Resell or provide the Services in a way that misrepresents UploadKit or creates unreasonable risk.</li>
        </ul>
        <p>We may remove content or suspend access when reasonably necessary to address abuse, security risks, legal obligations, or violations of these Terms.</p>
      </section>

      <section>
        <h2>5. API keys and BYOS</h2>
        <p>API keys must be used only in secure server environments unless explicitly designated for public use. You are responsible for your storage account, provider charges, bucket policies, availability, backups, and regulatory configuration in BYOS mode. UploadKit is not responsible for actions taken directly in your third-party storage account.</p>
      </section>

      <section>
        <h2>6. Fees, renewals, and taxes</h2>
        <p>Paid plans are billed in advance on a recurring basis, with usage-based charges billed as described at purchase. Subscriptions renew automatically until canceled. You authorize our payment provider to charge applicable fees and taxes. Except where law requires otherwise, payments are non-refundable and cancellation takes effect at the end of the current billing period. We will provide reasonable notice before pricing changes apply to an existing subscription.</p>
      </section>

      <section>
        <h2>7. Open-source software</h2>
        <p>Some UploadKit SDKs and components are offered under open-source licenses. Those licenses govern the software covered by them. These Terms govern hosted Services, accounts, paid features, and other portions not governed by a separate license.</p>
      </section>

      <section>
        <h2>8. Confidentiality and feedback</h2>
        <p>Each party will use reasonable care to protect non-public information identified as confidential or that should reasonably be understood as confidential. If you provide feedback, you grant us a perpetual, worldwide, royalty-free right to use it without restriction or obligation.</p>
      </section>

      <section>
        <h2>9. Service availability</h2>
        <p>We work to keep the Services reliable, but they are provided on an “as is” and “as available” basis. To the maximum extent permitted by law, UploadKit disclaims implied warranties of merchantability, fitness for a particular purpose, non-infringement, and uninterrupted or error-free operation. Preview and beta features may change or be discontinued and should not be used for critical workloads.</p>
      </section>

      <section>
        <h2>10. Limitation of liability</h2>
        <p>To the maximum extent permitted by law, UploadKit will not be liable for indirect, incidental, special, consequential, exemplary, or punitive damages, or for lost profits, revenues, data, or goodwill. UploadKit’s total liability arising from the Services will not exceed the greater of $100 or the amount you paid to UploadKit during the 12 months before the event giving rise to the claim. These limits do not apply where prohibited by law.</p>
      </section>

      <section>
        <h2>11. Indemnification</h2>
        <p>You will defend and indemnify UploadKit from third-party claims arising from Customer Content, your violation of these Terms or law, or your misuse of the Services, to the extent permitted by law. We will provide prompt notice and reasonable cooperation, and you may not settle a claim in a manner that admits fault or imposes obligations on UploadKit without consent.</p>
      </section>

      <section>
        <h2>12. Suspension and termination</h2>
        <p>You may stop using the Services at any time. We may suspend or terminate access for material breach, security risk, non-payment, legal requirement, or conduct that could harm the Services or others. Where practical, we will provide notice and an opportunity to cure. Upon termination, your right to use the Services ends; provisions that by nature should survive will remain effective.</p>
      </section>

      <section>
        <h2>13. General</h2>
        <p>These Terms and any incorporated policies are the entire agreement regarding the Services. You may not assign them without our consent; UploadKit may assign them as part of a merger, acquisition, reorganization, or sale of assets. If a provision is unenforceable, the remainder stays effective. Failure to enforce a provision is not a waiver. We may update these Terms and will post the revised version with a new effective date; continued use after an update constitutes acceptance where permitted by law.</p>
      </section>

      <section>
        <h2>14. Contact</h2>
        <p>Questions about these Terms may be sent to <a href="mailto:legal@uploadkit.dev">legal@uploadkit.dev</a>.</p>
      </section>
    </LegalPage>
  );
}
