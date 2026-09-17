export const PLANS = {
  free: {
    name: 'Free',
    price: 0,
    leadLimit: 3,
    features: [
      'Listed on platform',
      'Up to 3 leads / month',
      'Basic public profile (name, bio, score)',
      'SkillHub Score & badge',
    ],
    locked: [
      'Portfolio photo gallery',
      'Service offer cards',
      'Storefront on public profile',
      'Social media links on profile',
      'Priority in search results',
    ],
  },
  pro: {
    name: 'Pro',
    price: 9,
    leadLimit: Infinity,
    offerLimit: 5,
    photoLimit: 12,
    features: [
      'Unlimited leads',
      'Priority in search results',
      'Pro badge on profile',
      'Portfolio gallery — up to 12 photos',
      'Service offer cards — up to 5 offers',
      'Full storefront on public profile',
      'Social media links visible to clients',
      'Score boost visibility',
    ],
    locked: [
      'Featured on landing page',
      'Top of search results',
      'Up to 10 service offers',
    ],
  },
  elite: {
    name: 'Elite',
    price: 19,
    leadLimit: Infinity,
    offerLimit: 10,
    photoLimit: 12,
    features: [
      'Everything in Pro',
      'Featured on landing page (advertising)',
      'Top of search results',
      'Elite badge on profile',
      'Up to 10 service offer cards',
      'Dedicated admin support',
      'Priority dispute resolution',
    ],
    locked: [],
  },
};

/**
 * Manual payment channels offered for subscription renewals. An admin verifies
 * each submitted payment by hand — replace the labels and `detail` strings with
 * your own account details.
 */
export const PAYMENT_METHODS = [
  { id: 'bank_transfer',  label: 'Bank Transfer',   detail: 'Example Bank · Acc: 0000000000 · Name: Your Company Ltd' },
  { id: 'mobile_money',   label: 'Mobile Money',    detail: 'Send to: +1 555 0100' },
  { id: 'digital_wallet', label: 'Digital Wallet',  detail: 'Send to: wallet@example.com' },
  { id: 'online_banking', label: 'Online Banking',  detail: 'Pay to: Your Company Ltd' },
];
