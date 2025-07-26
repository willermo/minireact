import { createElement } from "@minireact";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen themed-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="themed-bg-secondary rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold themed-text-primary mb-8">
            Privacy Policy
          </h1>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold themed-text-primary mb-4">
                1. Introduction
              </h2>
              <p className="themed-text-secondary mb-4">
                Welcome to testapp ("we," "our," or "us"). We are committed to
                protecting your personal information and your right to privacy.
                This Privacy Policy explains how we collect, use, disclose, and
                safeguard your information when you use our Pong gaming
                platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold themed-text-primary mb-4">
                2. Information We Collect
              </h2>

              <h3 className="text-xl font-medium themed-text-primary mb-3">
                2.1 Personal Information
              </h3>
              <p className="themed-text-secondary mb-4">
                When you register for an account, we collect:
              </p>
              <ul className="list-disc pl-6 themed-text-secondary mb-4">
                <li>First name and last name</li>
                <li>Username and display name</li>
                <li>Email address</li>
                <li>Password (stored as a hashed value)</li>
                <li>Profile avatar (if uploaded)</li>
                <li>Two-factor authentication preferences</li>
                <li>Your consent to data processing (GDPR compliance)</li>
              </ul>

              <h3 className="text-xl font-medium themed-text-primary mb-3">
                2.2 Technical Data
              </h3>
              <p className="themed-text-secondary mb-4">
                We automatically collect certain technical information:
              </p>
              <ul className="list-disc pl-6 themed-text-secondary mb-4">
                <li>IP address and device information</li>
                <li>Browser type and version</li>
                <li>Usage patterns and preferences (theme settings)</li>
                <li>Session information</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold themed-text-primary mb-4">
                3. How We Use Your Information
              </h2>
              <p className="themed-text-secondary mb-4">
                We use your personal information for the following purposes:
              </p>
              <ul className="list-disc pl-6 themed-text-secondary mb-4">
                <li>
                  <strong>Account Management:</strong> Creating and managing
                  your user account
                </li>
                <li>
                  <strong>Authentication:</strong> Verifying your identity and
                  securing your account
                </li>
                <li>
                  <strong>Communication:</strong> Sending important account and
                  service updates
                </li>
                <li>
                  <strong>Security:</strong> Protecting against fraud, abuse,
                  and security threats
                </li>
                <li>
                  <strong>Legal Compliance:</strong> Complying with applicable
                  laws and regulations
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold themed-text-primary mb-4">
                4. Legal Basis for Processing (GDPR)
              </h2>
              <p className="themed-text-secondary mb-4">
                Under the General Data Protection Regulation (GDPR), we process
                your personal data based on:
              </p>
              <ul className="list-disc pl-6 themed-text-secondary mb-4">
                <li>
                  <strong>Consent:</strong> You have given clear consent for us
                  to process your personal data
                </li>
                <li>
                  <strong>Contract:</strong> Processing is necessary for the
                  performance of our service contract
                </li>
                <li>
                  <strong>Legitimate Interest:</strong> For security, fraud
                  prevention, and service improvement
                </li>
                <li>
                  <strong>Legal Obligation:</strong> To comply with applicable
                  laws and regulations
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold themed-text-primary mb-4">
                5. Data Sharing and Disclosure
              </h2>
              <p className="themed-text-secondary mb-4">
                We do not sell, trade, or rent your personal information to
                third parties. We may share your information only in the
                following circumstances:
              </p>
              <ul className="list-disc pl-6 themed-text-secondary mb-4">
                <li>
                  <strong>With Your Consent:</strong> When you explicitly agree
                  to share information
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law,
                  court order, or government request
                </li>
                <li>
                  <strong>Security:</strong> To protect our rights, property, or
                  safety, or that of our users
                </li>
                <li>
                  <strong>Business Transfer:</strong> In connection with a
                  merger, acquisition, or sale of assets
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold themed-text-primary mb-4">
                6. Your Rights Under GDPR
              </h2>
              <p className="themed-text-secondary mb-4">
                If you are a resident of the European Union, you have the
                following rights:
              </p>
              <ul className="list-disc pl-6 themed-text-secondary mb-4">
                <li>
                  <strong>Right to Access:</strong> Request copies of your
                  personal data
                </li>
                <li>
                  <strong>Right to Rectification:</strong> Request correction of
                  inaccurate personal data
                </li>
                <li>
                  <strong>Right to Erasure:</strong> Request deletion of your
                  personal data.{" "}
                  <strong>
                    You can delete your account directly by visiting your
                    Profile page and using the "Delete My Account" option.{" "}
                  </strong>
                  This will anonymize your personal data while preserving match
                  history for statistical purposes.
                </li>
                <li>
                  <strong>Right to Restrict Processing:</strong> Request
                  limitation of processing
                </li>
                <li>
                  <strong>Right to Data Portability:</strong> Request transfer
                  of your data
                </li>
                <li>
                  <strong>Right to Object:</strong> Object to processing of your
                  personal data
                </li>
                <li>
                  <strong>Right to Withdraw Consent:</strong> Withdraw consent
                  at any time
                </li>
              </ul>
              <p className="themed-text-secondary mb-4">
                To exercise these rights, please contact us using the
                information provided in the Contact section.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold themed-text-primary mb-4">
                7. Data Security
              </h2>
              <p className="themed-text-secondary mb-4">
                We implement appropriate technical and organizational security
                measures to protect your personal information:
              </p>
              <ul className="list-disc pl-6 themed-text-secondary mb-4">
                <li>Encryption of sensitive data in transit and at rest</li>
                <li>
                  Strong password hashing using industry-standard algorithms
                </li>
                <li>CSRF protection for all forms and API endpoints</li>
                <li>Regular security updates and monitoring</li>
                <li>Access controls and authentication mechanisms</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold themed-text-primary mb-4">
                8. Data Retention
              </h2>
              <p className="themed-text-secondary mb-4">
                We retain your personal information only for as long as
                necessary to fulfill the purposes outlined in this Privacy
                Policy, unless a longer retention period is required by law.
                When you delete your account, we will anonymize your data to
                preserve match histories while removing all personally
                identifiable information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold themed-text-primary mb-4">
                9. International Data Transfers
              </h2>
              <p className="themed-text-secondary mb-4">
                Your information may be transferred to and processed in
                countries other than your own. We ensure that such transfers
                comply with applicable data protection laws and implement
                appropriate safeguards to protect your personal information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold themed-text-primary mb-4">
                10. Children's Privacy
              </h2>
              <p className="themed-text-secondary mb-4">
                Our service is not intended for children under the age of 13. We
                do not knowingly collect personal information from children
                under 13. If you are a parent or guardian and believe your child
                has provided us with personal information, please contact us.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold themed-text-primary mb-4">
                11. Changes to This Privacy Policy
              </h2>
              <p className="themed-text-secondary mb-4">
                We may update this Privacy Policy from time to time. We will
                notify you of any changes by posting the new Privacy Policy on
                this page and updating the "Last updated" date. You are advised
                to review this Privacy Policy periodically for any changes.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold themed-text-primary mb-4">
                12. Contact Information
              </h2>
              <p className="themed-text-secondary mb-4">
                If you have any questions about this Privacy Policy or wish to
                exercise your rights, please contact us at:
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md">
                <p className="themed-text-secondary">
                  <strong>Email:</strong> to@be.enved
                  <br />
                  <strong>Data Protection Officer:</strong> Officer name
                  (to@be.enved)
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
