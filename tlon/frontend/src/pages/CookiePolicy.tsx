import { createElement } from "@minireact";

export default function CookiePolicy() {
  return (
    <div className="min-h-screen themed-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="themed-bg-secondary rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold themed-text-primary mb-8">
            Cookie Policy
          </h1>

          <div className="prose prose-gray dark:prose-invert max-w-none">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              <strong>Last updated:</strong> {new Date().toLocaleDateString()}
            </p>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold themed-text-primary mb-4">
                1. What Are Cookies
              </h2>
              <p className="themed-text-secondary mb-4">
                Cookies are small text files that are placed on your computer or
                mobile device when you visit our website. They are widely used
                to make websites work more efficiently and to provide
                information to website owners.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold themed-text-primary mb-4">
                2. How We Use Cookies
              </h2>
              <p className="themed-text-secondary mb-4">
                We use cookies for essential functionality only. We do not use
                any marketing, advertising, or tracking cookies. Our cookies are
                strictly necessary for the operation of our service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold themed-text-primary mb-4">
                3. Types of Cookies We Use
              </h2>

              <div className="space-y-6">
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6">
                  <h3 className="text-xl font-medium themed-text-primary mb-3">
                    3.1 Essential Cookies
                  </h3>
                  <p className="themed-text-secondary mb-4">
                    These cookies are strictly necessary for the operation of
                    our website and cannot be switched off in our systems. They
                    are usually only set in response to actions made by you
                    which amount to a request for services.
                  </p>

                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Cookie Name
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Purpose
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            Duration
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium themed-text-primary">
                            auth_token
                          </td>
                          <td className="px-6 py-4 text-sm themed-text-secondary">
                            Stores your authentication JWT token to keep you
                            logged in
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm themed-text-secondary">
                            Session/15 minutes
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium themed-text-primary">
                            csrf_token
                          </td>
                          <td className="px-6 py-4 text-sm themed-text-secondary">
                            Provides CSRF (Cross-Site Request Forgery)
                            protection for forms and API calls
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm themed-text-secondary">
                            Session
                          </td>
                        </tr>
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium themed-text-primary">
                            refresh_token
                          </td>
                          <td className="px-6 py-4 text-sm themed-text-secondary">
                            Allows automatic renewal of your authentication
                            token without re-login
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm themed-text-secondary">
                            7 days
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold themed-text-primary mb-4">
                4. Local Storage
              </h2>
              <p className="themed-text-secondary mb-4">
                In addition to cookies, we use your browser's local storage to
                store non-sensitive preferences:
              </p>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Item Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Purpose
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Data Type
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium themed-text-primary">
                        theme
                      </td>
                      <td className="px-6 py-4 text-sm themed-text-secondary">
                        Stores your theme preference (dark mode or light mode)
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm themed-text-secondary">
                        'dark' or 'light'
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium themed-text-primary">
                        consent
                      </td>
                      <td className="px-6 py-4 text-sm themed-text-secondary">
                        Records your cookie consent decision
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm themed-text-secondary">
                        'true', 'false', or 'declined'
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium themed-text-primary">
                        consent-date
                      </td>
                      <td className="px-6 py-4 text-sm themed-text-secondary">
                        Timestamp of when you made your consent decision
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm themed-text-secondary">
                        ISO date string
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold themed-text-primary mb-4">
                5. Cookie Categories
              </h2>

              <div className="space-y-4">
                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="text-lg font-medium themed-text-primary mb-2">
                    ✅ Strictly Necessary Cookies
                  </h3>
                  <p className="themed-text-secondary">
                    These cookies are essential for you to browse the website
                    and use its features. Without these cookies, services you
                    have asked for cannot be provided. We use these cookies for:
                  </p>
                  <ul className="list-disc pl-6 themed-text-secondary mt-2">
                    <li>User authentication and session management</li>
                    <li>Security and CSRF protection</li>
                    <li>Maintaining your login state</li>
                  </ul>
                </div>

                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="text-lg font-medium themed-text-primary mb-2">
                    ❌ Marketing/Advertising Cookies
                  </h3>
                  <p className="themed-text-secondary">
                    <strong>
                      We do not use any marketing or advertising cookies.
                    </strong>{" "}
                    We do not track you for advertising purposes or share your
                    data with advertising networks.
                  </p>
                </div>

                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="text-lg font-medium themed-text-primary mb-2">
                    ❌ Analytics/Performance Cookies
                  </h3>
                  <p className="themed-text-secondary">
                    <strong>
                      We do not use any analytics or performance tracking
                      cookies.
                    </strong>{" "}
                    We do not collect data about how you use our website for
                    analytics purposes.
                  </p>
                </div>

                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="text-lg font-medium themed-text-primary mb-2">
                    ❌ Functional Cookies
                  </h3>
                  <p className="themed-text-secondary">
                    <strong>
                      We do not use functional cookies beyond essential ones.
                    </strong>{" "}
                    Your theme preference is stored in local storage, not
                    cookies.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold themed-text-primary mb-4">
                6. Managing Your Cookie Preferences
              </h2>
              <p className="themed-text-secondary mb-4">
                Since we only use strictly necessary cookies, you cannot disable
                them without affecting the functionality of our service.
                However, you can:
              </p>
              <ul className="list-disc pl-6 themed-text-secondary mb-4">
                <li>
                  Clear your browser cookies at any time (this will log you out)
                </li>
                <li>
                  Configure your browser to block cookies (this will prevent you
                  from logging in)
                </li>
                <li>
                  Delete your local storage data (this will reset your theme
                  preference)
                </li>
              </ul>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg
                      className="h-5 w-5 text-yellow-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">
                      <strong>Important:</strong> Disabling essential cookies
                      will prevent you from using our service properly. You will
                      not be able to log in or maintain your session.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold themed-text-primary mb-4">
                7. Third-Party Cookies
              </h2>
              <p className="themed-text-secondary mb-4">
                We do not use any third-party cookies on our website. All
                cookies are set directly by our domain and are not shared with
                external services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold themed-text-primary mb-4">
                8. Updates to This Cookie Policy
              </h2>
              <p className="themed-text-secondary mb-4">
                We may update this Cookie Policy from time to time to reflect
                changes in our practices or for other operational, legal, or
                regulatory reasons. We will notify you of any material changes
                by updating the "Last updated" date at the top of this policy.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-semibold themed-text-primary mb-4">
                9. Contact Us
              </h2>
              <p className="themed-text-secondary mb-4">
                If you have any questions about our use of cookies, please
                contact us at:
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
