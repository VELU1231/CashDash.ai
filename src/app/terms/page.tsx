'use client';
export const runtime = 'edge';

import Link from 'next/link';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link href="/" className="text-sm text-primary hover:underline mb-8 inline-block">← Back to Home</Link>

        <h1 className="text-4xl font-serif font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Agreement to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using CashBash (&quot;the Service&quot;), you agree to be bound by these Terms of Service.
              If you do not agree, please do not use our Service. These terms apply to all visitors, users, and others who access or use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              CashBash is a personal finance management application that provides tools for tracking income,
              expenses, budgets, and financial goals. We also offer AI-powered insights and transaction categorization.
              The Service is provided &quot;as is&quot; and &quot;as available.&quot;
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>You must provide accurate and complete registration information.</li>
              <li>You are responsible for safeguarding your account credentials.</li>
              <li>You must notify us immediately of any unauthorized use of your account.</li>
              <li>You must be at least 16 years old to use this Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed mb-3">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Use the Service for any unlawful purpose or in violation of any applicable laws.</li>
              <li>Attempt to gain unauthorized access to any part of the Service.</li>
              <li>Interfere with or disrupt the integrity or performance of the Service.</li>
              <li>Upload or transmit malware, viruses, or other harmful code.</li>
              <li>Use the Service to store or process data that violates any third-party rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Financial Data Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              CashBash is a financial tracking tool, not a financial advisor. The AI insights and analytics provided
              are for informational purposes only and should not be considered financial, investment, tax, or legal advice.
              Always consult qualified professionals for financial decisions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Subscription & Billing</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Free tier users have access to basic features with usage limits.</li>
              <li>Paid subscriptions are billed through our payment processor (LemonSqueezy).</li>
              <li>Subscriptions auto-renew unless cancelled before the renewal date.</li>
              <li>Refunds are handled on a case-by-case basis. Contact support for assistance.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-xl font-semibold mb-3">7. Refund Policy</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong>Free tier:</strong> No charges, no refunds applicable.</li>
              <li><strong>Paid plans:</strong> You may request a full refund within 14 days of your initial purchase if you are not satisfied.</li>
              <li><strong>Renewals:</strong> Refunds for renewal charges are available within 7 days of the renewal date.</li>
              <li><strong>How to request:</strong> Email <a href="mailto:support@cashbash.app" className="text-primary hover:underline">support@cashbash.app</a> with your account email and reason.</li>
              <li><strong>Processing:</strong> Approved refunds are processed within 5-10 business days via the original payment method.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service and its original content, features, and functionality are owned by CashBash and are
              protected by international copyright, trademark, and other intellectual property laws.
              Your data remains yours — we do not claim ownership of data you input into the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may terminate or suspend your account immediately, without prior notice, for conduct that we
              believe violates these Terms or is harmful to other users, us, or third parties, or for any other
              reason at our sole discretion. Upon termination, you may request an export of your data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              In no event shall CashBash, its directors, employees, partners, or suppliers be liable for any
              indirect, incidental, special, consequential, or punitive damages, including loss of profits,
              data, use, or goodwill, arising out of or in connection with your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Changes to Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify these terms at any time. We will notify users of material changes
              via email or through the Service. Continued use after changes constitutes acceptance of the new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about these Terms, please contact us at{' '}
              <a href="mailto:support@cashbash.app" className="text-primary hover:underline">support@cashbash.app</a>
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-border/20 flex gap-6 text-sm text-muted-foreground">
          <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
        </div>
      </div>
    </div>
  );
}

