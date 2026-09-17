import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { SITE_NAME, SITE_LEGAL, SUPPORT_EMAIL, COUNTRY as COUNTRY_NAME, LEGAL_ADDRESS } from '../config/site.js';

const LAST_UPDATED = '7 May 2026';
const COMPANY      = SITE_LEGAL;
const EMAIL        = SUPPORT_EMAIL;
const COUNTRY      = COUNTRY_NAME;

const SECTIONS = [
  { id: 'controller',  title: '1. Data Controller' },
  { id: 'collect',     title: '2. What We Collect' },
  { id: 'how-collect', title: '3. How We Collect' },
  { id: 'legal-basis', title: '4. Legal Basis' },
  { id: 'use',         title: '5. How We Use Data' },
  { id: 'sharing',     title: '6. Sharing Your Data' },
  { id: 'idDoc',         title: '7. ID & Identity Docs' },
  { id: 'cookies',     title: '8. Cookies' },
  { id: 'security',    title: '9. Data Security' },
  { id: 'rights',      title: '10. Your Rights' },
  { id: 'retention',   title: '11. Data Retention' },
  { id: 'children',    title: '12. Children\'s Privacy' },
  { id: 'changes',     title: '13. Policy Changes' },
  { id: 'contact',     title: '14. Contact' },
];

function Section({ id, title, children }) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="text-xl font-bold text-stone-900 mb-4 pb-2 border-b border-stone-100">{title}</h2>
      <div className="text-stone-600 space-y-3 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function Callout({ color = 'violet', children }) {
  const styles = {
    violet: 'bg-violet-50 border-violet-400 text-violet-800',
    green:  'bg-green-50  border-green-400  text-green-800',
    amber:  'bg-amber-50  border-amber-400  text-amber-800',
  };
  return (
    <div className={`border-l-4 rounded-r-xl px-4 py-3 text-sm my-4 ${styles[color]}`}>
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

const DATA_TABLE = [
  { cat: 'Identity',  ex: 'Name, ID number, ID photos',                               purpose: 'Account verification, trust & safety',             kept: '5 years' },
  { cat: 'Contact',   ex: 'Email, mobile, WhatsApp number',                             purpose: 'Account access, job notifications',                 kept: 'Account lifetime' },
  { cat: 'Location',  ex: 'District, province',                                         purpose: 'Matching Workers to nearby Clients',                kept: 'Account lifetime' },
  { cat: 'Profile',   ex: 'Bio, photo, trade category, portfolio photos',               purpose: 'Public profile display',                           kept: 'Account lifetime' },
  { cat: 'Financial', ex: 'Subscription plan, payment reference numbers',               purpose: 'Billing, fraud prevention',                        kept: '7 years' },
  { cat: 'Usage',     ex: 'Pages visited, search terms, device type',                   purpose: 'Platform improvement, analytics',                  kept: '2 years' },
  { cat: 'Job data',  ex: 'Job descriptions, agreed rates, ratings, reviews',           purpose: 'Marketplace operation, dispute resolution',         kept: '7 years' },
];

export default function Privacy() {
  return (
    <div className="min-h-screen bg-stone-50">
      <SEO
        title="Privacy Policy"
        description="Learn how SkillHub collects, uses and protects your personal data. Your privacy matters to us — read our full Privacy Policy."
        url="/privacy"
      />

      {/* ── Page header ──────────────────────────────────────────────── */}
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="flex items-center gap-2 text-xs text-stone-400 mb-3">
            <Link to="/" className="hover:text-violet-600 transition-colors">SkillHub</Link>
            <span>/</span>
            <span className="text-stone-600">Privacy Policy</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-violet-600 bg-violet-50 px-3 py-1 rounded-full mb-3">Legal</span>
              <h1 className="text-3xl font-black text-stone-900">Privacy Policy</h1>
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
              <Link to="/terms" className="text-xs text-stone-400 hover:text-violet-600 block mb-2">Terms &amp; Conditions →</Link>
              <a href={`mailto:${EMAIL}`} className="text-xs text-stone-400 hover:text-violet-600 block">Privacy enquiries →</a>
            </div>
          </aside>

          {/* ── Main content ─────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">

            {/* Intro banner */}
            <Callout>
              This Privacy Policy explains how <strong>{COMPANY}</strong> collects, uses, stores, and protects
              your personal information when you use the SkillHub platform.
            </Callout>

            <Section id="controller" title="1. Data Controller">
              <p>
                <strong>{COMPANY}</strong> is the data controller responsible for your personal information.
                For privacy-related enquiries contact our Privacy Team at{' '}
                <a href={`mailto:${EMAIL}`} className="text-violet-600 underline font-medium">{EMAIL}</a>.
              </p>
            </Section>

            <Section id="collect" title="2. What Data We Collect">
              <p>We collect the following categories of personal data:</p>
              <div className="overflow-x-auto mt-4 rounded-xl border border-stone-200 shadow-sm">
                <table className="w-full text-left bg-white text-xs">
                  <thead className="bg-stone-50 border-b border-stone-200">
                    <tr>
                      {['Category', 'Examples', 'Purpose', 'Kept for'].map((h) => (
                        <th key={h} className="py-3 px-4 font-bold text-stone-500 uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DATA_TABLE.map((row, i) => (
                      <tr key={i} className="border-b border-stone-50 last:border-0 hover:bg-stone-50 transition-colors">
                        <td className="py-3 px-4 font-semibold text-stone-700 align-top whitespace-nowrap">{row.cat}</td>
                        <td className="py-3 px-4 text-stone-500 align-top">{row.ex}</td>
                        <td className="py-3 px-4 text-stone-500 align-top">{row.purpose}</td>
                        <td className="py-3 px-4 text-stone-500 align-top whitespace-nowrap">{row.kept}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section id="how-collect" title="3. How We Collect Data">
              <p>We collect personal data:</p>
              <Ul items={[
                'Directly from you — when you register, complete your profile, post a job, or contact us.',
                'Automatically — via cookies and server logs when you use the platform.',
                'From third parties — payment processors who confirm transaction status.',
              ]} />
            </Section>

            <Section id="legal-basis" title="4. Legal Basis for Processing">
              <p>We process your data on the following legal bases:</p>
              <Ul items={[
                'Contract performance — to provide the marketplace service you signed up for.',
                `Legal obligation — to comply with ${COUNTRY} laws (e.g. financial record-keeping).`,
                'Legitimate interests — to improve the platform, detect fraud, and ensure safety.',
                'Consent — for marketing communications (you can withdraw consent at any time).',
              ]} />
            </Section>

            <Section id="use" title="5. How We Use Your Data">
              <Ul items={[
                'Create and manage your account.',
                'Match Clients with suitable Workers based on location, category, and availability.',
                'Process payments and maintain financial records.',
                'Calculate and display the SkillHub Score.',
                'Moderate profile content before publication.',
                'Resolve disputes between Clients and Workers.',
                'Send transactional notifications (job updates, payment confirmations).',
                'Detect and prevent fraud, abuse, and policy violations.',
                'Comply with legal and regulatory requirements.',
              ]} />
            </Section>

            <Section id="sharing" title="6. Sharing Your Data">
              <Callout color="green">We do not sell your personal data to any third party.</Callout>
              <p>We share data only in these circumstances:</p>
              <Ul items={[
                'Between platform users — your public profile (name, photo, bio, category, district, score) is visible to site visitors. Phone and WhatsApp are shared only with logged-in users.',
                'Service providers — cloud hosting, email delivery, and payment processors who act as our data processors and are contractually bound to protect your data.',
                `Legal authorities — when required by law, court order, or to protect the safety of our users.`,
                'Business transfers — if SkillHub is acquired or merged, your data may transfer to the new entity under equivalent protections.',
              ]} />
            </Section>

            <Section id="idDoc" title="7. ID & Identity Documents">
              <p>
                ID photos (front and back) and ID numbers are collected solely for identity verification.
                These are stored securely, accessible only to authorised SkillHub admins, and are never
                displayed publicly or shared with Clients.
              </p>
              <Callout color="amber">
                Once your ID is verified, photos may be deleted from active servers and retained only in
                encrypted archives for legal compliance.
              </Callout>
            </Section>

            <Section id="cookies" title="8. Cookies">
              <p>
                We use <strong>essential cookies</strong> to keep you logged in and prevent CSRF attacks, and
                <strong> analytics cookies</strong> to understand how the platform is used. You can control cookie
                preferences in your browser settings, but disabling essential cookies may break core functionality.
              </p>
            </Section>

            <Section id="security" title="9. Data Security">
              <p>
                We use industry-standard security measures including TLS encryption in transit, hashed passwords
                (bcrypt), and role-based access controls.
              </p>
              <p>
                In the event of a data breach likely to affect your rights, we will notify you within 72 hours
                of becoming aware, in compliance with applicable law.
              </p>
            </Section>

            <Section id="rights" title="10. Your Rights">
              <p>Subject to applicable law, you have the right to:</p>
              <div className="grid sm:grid-cols-2 gap-3 mt-3">
                {[
                  { right: 'Access',            desc: 'Request a copy of the personal data we hold about you.' },
                  { right: 'Rectification',     desc: 'Correct inaccurate or incomplete data.' },
                  { right: 'Erasure',           desc: 'Request deletion where we no longer have a legal basis to retain it.' },
                  { right: 'Restriction',       desc: 'Ask us to limit processing while a dispute is resolved.' },
                  { right: 'Portability',       desc: 'Receive your data in a machine-readable format.' },
                  { right: 'Withdraw consent',  desc: 'For any processing based on your consent (e.g. marketing emails).' },
                ].map((item) => (
                  <div key={item.right} className="bg-stone-50 border border-stone-200 rounded-xl p-3.5">
                    <p className="font-semibold text-stone-800 text-xs mb-1">{item.right}</p>
                    <p className="text-stone-500 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
              <p className="mt-4">
                To exercise any right, email{' '}
                <a href={`mailto:${EMAIL}`} className="text-violet-600 underline font-medium">{EMAIL}</a>.
                We will respond within <strong>30 days</strong>.
              </p>
            </Section>

            <Section id="retention" title="11. Data Retention">
              <p>
                We retain personal data for as long as your account is active or as needed to provide services.
                After account deletion:
              </p>
              <Ul items={[
                `Financial records retained for 7 years as required by ${COUNTRY} tax law.`,
                'ID and identity documents retained for 5 years.',
                'Analytics data anonymised after 2 years.',
              ]} />
            </Section>

            <Section id="children" title="12. Children's Privacy">
              <p>
                SkillHub is not directed at children under 18. We do not knowingly collect personal data from
                minors. If you believe a minor has registered please contact us and we will delete the account promptly.
              </p>
            </Section>

            <Section id="changes" title="13. Changes to This Policy">
              <p>
                We may update this Privacy Policy periodically. Registered users will be notified by email of
                material changes at least <strong>14 days</strong> before they take effect. The latest version
                is always available at <strong>skillhub.example.com/privacy</strong>.
              </p>
            </Section>

            <Section id="contact" title="14. Contact">
              <p>
                Privacy enquiries:{' '}
                <a href={`mailto:${EMAIL}`} className="text-violet-600 underline font-medium">{EMAIL}</a>
              </p>
              <p>Platform: {SITE_NAME}, {LEGAL_ADDRESS}, {COUNTRY}.</p>
            </Section>

            {/* Footer nav */}
            <div className="border-t border-stone-200 pt-6 mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
              <Link to="/" className="text-stone-400 hover:text-stone-600 transition-colors">← Back to SkillHub</Link>
              <div className="flex gap-4 text-stone-400">
                <Link to="/terms" className="hover:text-violet-600 transition-colors">Terms &amp; Conditions</Link>
                <a href={`mailto:${EMAIL}`} className="hover:text-violet-600 transition-colors">Contact</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
