import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { SITE_LEGAL, SUPPORT_EMAIL, COUNTRY as COUNTRY_NAME, LEGAL_ADDRESS, CURRENCY_SYMBOL } from '../config/site.js';

const LAST_UPDATED = '7 May 2026';
const COMPANY      = SITE_LEGAL;
const EMAIL        = SUPPORT_EMAIL;
const COUNTRY      = COUNTRY_NAME;

const SECTIONS = [
  { id: 'who-we-are',        title: '1. Who We Are' },
  { id: 'eligibility',       title: '2. Eligibility' },
  { id: 'account',           title: '3. Account Security' },
  { id: 'worker-obligations',title: '4. Worker Obligations' },
  { id: 'client-obligations',title: '5. Client Obligations' },
  { id: 'payments',          title: '6. Payments & Escrow' },
  { id: 'score',             title: '7. Score & Moderation' },
  { id: 'prohibited',        title: '8. Prohibited Conduct' },
  { id: 'disputes',          title: '9. Dispute Resolution' },
  { id: 'liability',         title: '10. Liability' },
  { id: 'ip',                title: '11. Intellectual Property' },
  { id: 'changes',           title: '12. Changes to Terms' },
  { id: 'law',               title: '13. Governing Law' },
  { id: 'contact',           title: '14. Contact' },
];

function Section({ id, title, children }) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="text-xl font-bold text-stone-900 mb-4 pb-2 border-b border-stone-100">{title}</h2>
      <div className="text-stone-600 space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function Callout({ children }) {
  return (
    <div className="bg-violet-50 border-l-4 border-violet-400 rounded-r-xl px-4 py-3 text-sm text-violet-800 my-4">
      {children}
    </div>
  );
}

function Ul({ items }) {
  return (
    <ul className="space-y-1.5 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="mt-0.5 w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Terms() {
  return (
    <div className="min-h-screen bg-stone-50">
      <SEO
        title="Terms & Conditions"
        description="Read the Terms and Conditions governing use of the platform for clients, workers and businesses."
        url="/terms"
      />

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center gap-2 text-xs text-stone-400 mb-3">
            <Link to="/" className="hover:text-violet-600 transition-colors">SkillHub</Link>
            <span>/</span>
            <span className="text-stone-600">Terms &amp; Conditions</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-violet-600 bg-violet-50 px-3 py-1 rounded-full mb-3">Legal</span>
              <h1 className="text-3xl font-black text-stone-900">Terms &amp; Conditions</h1>
            </div>
            <div className="text-right">
              <p className="text-xs text-stone-400">Last updated</p>
              <p className="text-sm font-semibold text-stone-600">{LAST_UPDATED}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="flex gap-10 items-start">

          {/* ── Sticky TOC (desktop) ─────────────────────────────────── */}
          <aside className="hidden lg:block w-56 shrink-0 sticky top-6">
            <p className="text-xs font-bold uppercase tracking-widest text-stone-400 mb-3">On this page</p>
            <nav className="space-y-1">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block text-xs text-stone-500 hover:text-violet-600 hover:bg-violet-50
                             py-1.5 px-2.5 rounded-lg transition-colors leading-snug"
                >
                  {s.title}
                </a>
              ))}
            </nav>
            <div className="mt-6 pt-5 border-t border-stone-200">
              <Link to="/privacy" className="text-xs text-stone-400 hover:text-violet-600 block mb-2">Privacy Policy →</Link>
              <a href={`mailto:${EMAIL}`} className="text-xs text-stone-400 hover:text-violet-600 block">Legal enquiries →</a>
            </div>
          </aside>

          {/* ── Main content ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Intro banner */}
            <Callout>
              Please read these Terms &amp; Conditions carefully before using SkillHub. By registering or
              using our services you agree to be bound by these terms.
            </Callout>

            <Section id="who-we-are" title="1. Who We Are">
              <p>
                SkillHub is an online marketplace platform connecting clients seeking skilled trade and
                service workers with individuals or businesses providing those services. References to
                "SkillHub", "we", "us", or "our" refer to {COMPANY}.
              </p>
            </Section>

            <Section id="eligibility" title="2. Eligibility">
              <p>To use SkillHub you must:</p>
              <Ul items={[
                'Be at least 18 years of age.',
                `Be a resident or legal business entity operating in ${COUNTRY}.`,
                'Provide accurate and complete registration information.',
                'Not have been previously suspended or banned from our platform.',
              ]} />
            </Section>

            <Section id="account" title="3. Account Registration & Security">
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all
                activity that occurs under your account. Notify us immediately at{' '}
                <a href={`mailto:${EMAIL}`} className="text-violet-600 underline font-medium">{EMAIL}</a>{' '}
                if you suspect unauthorised access.
              </p>
              <p>
                We reserve the right to suspend or terminate accounts that provide false information, violate
                these Terms, or engage in fraudulent activity.
              </p>
            </Section>

            <Section id="worker-obligations" title="4. Worker Obligations">
              <p>Workers registered on SkillHub agree to:</p>
              <Ul items={[
                'Provide services professionally, safely, and to the standard agreed with the Client.',
                'Hold any licences, certifications, or permits required by law for the services they offer.',
                'Submit accurate identity (ID) and certification documents for verification.',
                'Not solicit Clients to transact outside the SkillHub platform during an active job.',
                `Comply with all applicable ${COUNTRY} labour and trade laws.`,
              ]} />
              <Callout>
                Workers are independent contractors — not employees of SkillHub. Workers are solely
                responsible for their tax obligations, insurance, and legal compliance.
              </Callout>
            </Section>

            <Section id="client-obligations" title="5. Client Obligations">
              <p>Clients agree to:</p>
              <Ul items={[
                'Provide accurate job descriptions and a safe working environment.',
                'Pay the agreed rate promptly upon job completion via the SkillHub platform.',
                'Not engage in harassment, discrimination, or abusive conduct toward Workers.',
                'Raise disputes through the SkillHub resolution process rather than withholding payment unilaterally.',
              ]} />
            </Section>

            <Section id="payments" title="6. Payments, Fees & Escrow">
              <p>
                All payments are processed through the SkillHub platform. Once a Client accepts a quote the
                agreed amount is held in <strong>escrow</strong> and released to the Worker upon job completion
                or after a dispute is resolved in the Worker's favour.
              </p>
              <p>
                SkillHub charges a service fee on each completed transaction, displayed at the time of
                booking. Fees are non-refundable except where required by law.
              </p>
              <p>
                Subscription plans (Pro, Elite) are billed monthly and auto-renew unless cancelled before the
                renewal date. No pro-rata refunds are issued for early cancellation.
              </p>
              <Callout>
                Accepted payment methods: bank transfer, mobile money, digital wallet and online banking.
                All manual payments are verified by our admin team within 24 hours.
              </Callout>
            </Section>

            <Section id="score" title="7. SkillHub Score & Moderation">
              <p>
                The SkillHub Score is a proprietary algorithmic rating reflecting a Worker's reliability,
                responsiveness, completion rate, and verified credentials. The score is for guidance only;
                SkillHub may adjust the algorithm at any time without notice.
              </p>
              <p>
                Profile content (bios, portfolio photos, service offers) is subject to moderation before
                being published. We reserve the right to reject content that is misleading, offensive, or
                violates our community guidelines.
              </p>
            </Section>

            <Section id="prohibited" title="8. Prohibited Conduct">
              <p>You must not use SkillHub to:</p>
              <Ul items={[
                'Post false, misleading, or fraudulent listings or reviews.',
                'Circumvent the platform to avoid service fees.',
                'Collect other users\' personal data without consent.',
                'Upload content that is defamatory, obscene, or infringes third-party rights.',
                'Use automated tools to scrape or abuse the platform.',
              ]} />
              <p>
                Violations may result in immediate account suspension, forfeiture of pending earnings, and
                legal action where applicable.
              </p>
            </Section>

            <Section id="disputes" title="9. Dispute Resolution">
              <p>
                Either party may raise a dispute through the SkillHub platform within <strong>7 days</strong> of
                the scheduled completion date. Our team will review evidence from both parties and issue a
                binding decision within 5 business days.
              </p>
              <p>
                SkillHub's decision is final for amounts under {CURRENCY_SYMBOL}500. For larger amounts, unresolved
                disputes may be referred to arbitration under the arbitration law of {COUNTRY}.
              </p>
            </Section>

            <Section id="liability" title="10. Limitation of Liability">
              <p>
                SkillHub is a marketplace platform and does not perform the services listed. We are not liable
                for the quality, safety, or legality of services delivered by Workers, nor for any personal
                injury, property damage, or financial loss arising from a job.
              </p>
              <p>
                To the maximum extent permitted by law, SkillHub's total liability shall not exceed the total
                service fees paid by you in the 3 months preceding the event giving rise to the claim.
              </p>
            </Section>

            <Section id="ip" title="11. Intellectual Property">
              <p>
                All platform content — including the logo, name, design, and software — is owned by or
                licensed to {COMPANY}. You may not reproduce or distribute it without our prior written consent.
              </p>
              <p>
                By uploading content (portfolio photos, bio, reviews) you grant SkillHub a non-exclusive,
                royalty-free, worldwide licence to display that content on the platform and in marketing materials.
              </p>
            </Section>

            <Section id="changes" title="12. Changes to These Terms">
              <p>
                We may update these Terms from time to time. Material changes will be notified by email or
                in-app notice at least <strong>14 days</strong> before they take effect. Continued use after
                the effective date constitutes acceptance of the revised Terms.
              </p>
            </Section>

            <Section id="law" title="13. Governing Law">
              <p>
                These Terms are governed by the laws of {COUNTRY}. Disputes not resolved by arbitration shall
                be subject to the exclusive jurisdiction of the courts of {COUNTRY}.
              </p>
            </Section>

            <Section id="contact" title="14. Contact Us">
              <p>
                For legal enquiries:{' '}
                <a href={`mailto:${EMAIL}`} className="text-violet-600 underline font-medium">{EMAIL}</a>
              </p>
              <p>Registered address: {COMPANY}, {LEGAL_ADDRESS}, {COUNTRY}.</p>
            </Section>

            {/* Footer nav */}
            <div className="border-t border-stone-200 pt-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
              <Link to="/" className="text-stone-400 hover:text-stone-600 transition-colors">← Back to SkillHub</Link>
              <div className="flex gap-4 text-stone-400">
                <Link to="/privacy" className="hover:text-violet-600 transition-colors">Privacy Policy</Link>
                <a href={`mailto:${EMAIL}`} className="hover:text-violet-600 transition-colors">Contact</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
