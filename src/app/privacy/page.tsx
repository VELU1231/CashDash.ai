export const runtime = 'edge';
'use client';

import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-primary hover:underline mb-8 inline-block">← Back to Home</Link>

        <h1 className="text-4xl font-serif font-bold mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <h3 className="text-base font-medium mt-4 mb-2">Personal Information</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
              <li>Email address (for authentication and account recovery)</li>
              <li>Display name (optional, for personalization)</li>
              <li>Profile preferences (currency, timezone, theme)</li>
            </ul>
            <h3 className="text-base font-medium mt-4 mb-2">Financial Data</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
              <li>Transaction records you manually enter (amounts, descriptions, categories)</li>
              <li>Account balances and names you create</li>
              <li>Budget and goal configurations</li>
              <li>Uploaded receipts and attachments</li>
            </ul>
            <h3 className="text-base font-medium mt-4 mb-2">Automatically Collected</h3>
            <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground">
              <li>Device type and browser information</li>
              <li>IP address (for security and fraud prevention)</li>
              <li>Usage patterns (pages visited, features used)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong>Provide the Service:</strong> Process your transactions, generate analytics, and power AI insights.</li>
              <li><strong>Improve the Service:</strong> Analyze aggregate usage patterns to improve features and performance.</li>
              <li><strong>Communication:</strong> Send service updates, security alerts, and support messages.</li>
              <li><strong>Security:</strong> Detect, prevent, and address fraud and technical issues.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. AI & Data Processing</h2>
            <p className="text-muted-foreground leading-relaxed">
              When you use our AI features (chatbot, insights, receipt scanning), your transaction data may be
              processed by third-party AI providers (such as Google Gemini or OpenAI) to generate responses.
              We send only the minimum data necessary and do not allow AI providers to use your data for training.
              AI-generated insights are for informational purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Storage & Security</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Your data is stored securely in Supabase (PostgreSQL) with row-level security (RLS).</li>
              <li>All data in transit is encrypted using TLS/HTTPS.</li>
              <li>Passwords are hashed and never stored in plain text.</li>
              <li>We implement industry-standard security measures to protect against unauthorized access.</li>
              <li>We do not sell, trade, or rent your personal information to third parties.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Sharing</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">We share your data only in these limited circumstances:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong>Service Providers:</strong> Supabase (database), Vercel (hosting), LemonSqueezy (payments), AI providers.</li>
              <li><strong>Legal Requirements:</strong> When required by law, legal process, or governmental request.</li>
              <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">You have the right to:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong>Access:</strong> Request a copy of your personal data.</li>
              <li><strong>Export:</strong> Download all your transaction data via the Import/Export feature.</li>
              <li><strong>Correction:</strong> Update inaccurate personal information in your Settings.</li>
              <li><strong>Deletion:</strong> Request deletion of your account and all associated data.</li>
              <li><strong>Portability:</strong> Export your data in standard CSV format.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Cookies & Local Storage</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use essential cookies for authentication and session management. We also use local storage
              to save your theme preference and UI state. We do not use advertising or tracking cookies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Children&apos;s Privacy</h2>
            <p className="text-muted-foreground leading-relaxed">
              Our Service is not directed to children under 16. We do not knowingly collect personal information
              from children under 16. If you become aware that a child has provided us with personal data,
              please contact us and we will take steps to delete such information.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Data Retention</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your data for as long as your account is active. If you delete your account,
              we will delete your personal data within 30 days, except where we are required to retain
              it for legal or regulatory purposes.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes by
              posting the new policy on this page and updating the &quot;Last updated&quot; date. Material changes
              will be communicated via email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For any questions about this Privacy Policy or to exercise your data rights, contact us at{' '}
              <a href="mailto:privacy@cashbash.app" className="text-primary hover:underline">privacy@cashbash.app</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border/20 flex gap-6 text-sm text-muted-foreground">
          <Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link>
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
        </div>
      </div>
    </div>
  );
}

