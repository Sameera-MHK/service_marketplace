/**
 * SkillHub — Safe Test User Seeder
 * ────────────────────────────────────
 * Adds test accounts WITHOUT wiping existing data.
 * Skips any user whose email already exists.
 *
 *   cd server && node seeds/addTestUsers.js
 *
 * Test credentials:
 *   Admin:    admin@skillhub.example.com        / Admin123!
 *   Workers:  daniel@example.com / password123  (and others)
 *   Clients:  alice@example.com   / password123  (and others)
 *   Business: cleaners@example.com / password123 (and others)
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { generateSlug } from '../utils/slugify.js';

import User            from '../models/User.js';
import WorkerProfile   from '../models/WorkerProfile.js';
import WorkerOffer     from '../models/WorkerOffer.js';
import BusinessProfile from '../models/BusinessProfile.js';
import Category        from '../models/Category.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../.env') });

const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const range = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const avatar = (seed) => `https://picsum.photos/seed/${seed}/300/300`;

const PORTFOLIO = {
  electrician:     ['https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=600','https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600'],
  photographer:    ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600','https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=600'],
  carpenter:       ['https://images.unsplash.com/photo-1601058272524-0611e132f3ce?w=600','https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=600'],
  mechanic:        ['https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?w=600','https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600'],
  plumber:         ['https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=600','https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600'],
  ac_technician:   ['https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600','https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600'],
  tutor:           ['https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600','https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600'],
  painter:         ['https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=600','https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600'],
  caterer:         ['https://images.unsplash.com/photo-1555244162-803834f70033?w=600','https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600'],
  graphic_designer:['https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600','https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600'],
  default:         ['https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600'],
};
const getPortfolio = (cat) => PORTFOLIO[cat] || PORTFOLIO.default;

// ─── Workers ──────────────────────────────────────────────────────────────────
const WORKERS = [
  { name:'Daniel Brooks', email:'daniel@example.com', slug:'daniel',  category:'electrician',    district:'Downtown',    exp:15, rateMin:50,  rateMax:90,  score:96, plan:'elite', idDoc:true,  featured:true,  bio:'Master electrician with 15 years of residential and commercial experience. Fully licensed by the national electrical board.', languages:['English','Spanish'] },
  { name:'Elena Rivera',   email:'elena@example.com',  slug:'elena',   category:'photographer',   district:'Downtown',    exp:8,  rateMin:150, rateMax:500, score:93, plan:'elite', idDoc:true,  featured:true,  bio:'Award-winning photographer specialising in weddings, corporate events, and portraits. Over 500 events covered across the region.', languages:['English','Spanish','French'] },
  { name:'Marcus Chen',         email:'marcus@example.com',    slug:'marcus',     category:'carpenter',      district:'Northside',    exp:12, rateMin:40,  rateMax:70,  score:91, plan:'elite', idDoc:true,  featured:true,  bio:'Custom furniture maker and interior carpenter. Specialise in built-in wardrobes, kitchen cabinets, and luxury bedroom sets.', languages:['English'] },
  { name:'Omar Haddad',     email:'omar@example.com',   slug:'omar',    category:'mechanic',       district:'Hillview',      exp:10, rateMin:30,  rateMax:60,  score:89, plan:'elite', idDoc:true,  featured:true,  bio:'Certified auto mechanic specialising in Japanese and European vehicles. Full diagnostic equipment, engine overhauls, and gearbox repairs.', languages:['English','Spanish'] },
  { name:'Priya Nair',        email:'priya@example.com',    slug:'priya',     category:'plumber',        district:'Downtown',    exp:9,  rateMin:30,  rateMax:55,  score:86, plan:'pro',   idDoc:true,  featured:false, bio:'Experienced plumber handling all types of residential and commercial plumbing.', languages:['English','Spanish'] },
  { name:'Tomas Novak',       email:'tomas@example.com',  slug:'tomas',   category:'ac_technician',  district:'Downtown',    exp:7,  rateMin:35,  rateMax:60,  score:84, plan:'pro',   idDoc:true,  featured:false, bio:'Authorised service agent for all major air-conditioner brands.', languages:['English','Spanish'] },
  { name:'Aisha Bello',     email:'aisha@example.com',slug:'aisha', category:'tutor',          district:'Hillview',      exp:6,  rateMin:20,  rateMax:40,  score:82, plan:'pro',   idDoc:true,  featured:false, bio:'High-school Mathematics and Physics tutor. Former lecturer at a leading tuition institute.', languages:['English','Spanish'] },
  { name:'Lucas Moreau',      email:'lucas@example.com',   slug:'lucas',    category:'painter',        district:'Northside',    exp:6,  rateMin:25,  rateMax:45,  score:80, plan:'pro',   idDoc:true,  featured:false, bio:'Interior and exterior painting professional. Use only premium trade paints.', languages:['English'] },
  { name:'Sofia Rossi', email:'sofia@example.com',    slug:'sofia',     category:'caterer',        district:'Harborview',      exp:8,  rateMin:80,  rateMax:300, score:78, plan:'pro',   idDoc:true,  featured:false, bio:'Full-service caterer for weddings, corporate events, and birthday parties.', languages:['English','Spanish'] },
  { name:'Noah Weber',  email:'noah@example.com',  slug:'noah',   category:'graphic_designer',district:'Downtown',   exp:5,  rateMin:50,  rateMax:200, score:77, plan:'pro',   idDoc:true,  featured:false, bio:'Brand identity designer and digital illustrator. Unlimited revisions until satisfied.', languages:['English','Spanish'] },
  { name:'Jonas Vogel',    email:'jonas@example.com',   slug:'jonas',    category:'mason',          district:'Harborview',      exp:4,  rateMin:30,  rateMax:50,  score:68, plan:'free',  idDoc:false, featured:false, bio:'General mason available for tile fixing, rendering, and minor structural work.', languages:['English'] },
  { name:'Maya Okafor',  email:'maya@example.com',  slug:'maya',   category:'cleaner',        district:'Northside',    exp:3,  rateMin:15,  rateMax:30,  score:62, plan:'free',  idDoc:false, featured:false, bio:'Professional house cleaner. Deep cleaning and regular weekly service.', languages:['English'] },
  { name:'Grace Mensah',        email:'grace@example.com',   slug:'grace',    category:'home_nurse',     district:'Downtown',    exp:6,  rateMin:30,  rateMax:60,  score:79, plan:'free',  idDoc:true,  featured:false, bio:'Registered nurse offering home care for elderly patients. 24-hour availability.', languages:['English','Spanish','French'] },
];

// ─── Businesses ───────────────────────────────────────────────────────────────
const BUSINESSES = [
  {
    name:'Downtown Pro Cleaners',     email:'cleaners@example.com',
    type:'cleaning_company', district:'Downtown', phone:'+15550113', whatsapp:'+15550114',
    tagline:'Spotless spaces, every time',
    description:'Professional cleaning company serving residential and commercial clients across Downtown.',
    cover:'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=800',
    services:[
      { name:'Deep House Clean',  priceMin:50,  priceMax:150, description:'Full house deep clean including all rooms and bathrooms' },
      { name:'Office Cleaning',   priceMin:80,  priceMax:300, description:'Daily or weekly office cleaning service' },
      { name:'Carpet Cleaning',   priceMin:20,  priceMax:80,  description:'Steam cleaning for all carpet types' },
    ],
  },
  {
    name:'Hillview Studio Photography', email:'photo@example.com',
    type:'photography_studio', district:'Hillview', phone:'+15550115', whatsapp:'+15550116',
    tagline:'Capturing your most precious moments',
    description:'Award-winning photography studio in Hillview covering weddings, pre-shoots, and events.',
    cover:'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
    services:[
      { name:'Wedding Photography', priceMin:500, priceMax:1500, description:'Full-day wedding coverage with 500+ edited photos' },
      { name:'Portrait Session',    priceMin:80,  priceMax:180,  description:'1-hour studio portrait session, 50 edited photos' },
      { name:'Event Photography',   priceMin:200, priceMax:600,  description:'Corporate events, parties, and ceremonies' },
    ],
  },
  {
    name:'Harborview Catering Co.',       email:'catering@example.com',
    type:'catering', district:'Harborview', phone:'+15550117', whatsapp:'+15550118',
    tagline:'Authentic regional flavours for every occasion',
    description:'Family-run catering business with 20 years of experience serving up to 2,000 guests.',
    cover:'https://images.unsplash.com/photo-1555244162-803834f70033?w=800',
    services:[
      { name:'Wedding Buffet',   priceMin:8,   priceMax:20,  description:'Per head — full hot buffet' },
      { name:'Corporate Lunch',  priceMin:5,   priceMax:12,  description:'Per head — box lunch or buffet for office events' },
      { name:'Birthday Party',   priceMin:250, priceMax:800, description:'Full setup, food, and service for 50–200 guests' },
    ],
  },
  {
    name:'SmartFix Repair Shop',     email:'repair@example.com',
    type:'repair_shop', district:'Downtown', phone:'+15550119', whatsapp:'+15550120',
    tagline:'All electronics repaired — fast and affordable',
    description:'Electronics and appliance repair centre in the Downtown district. Same-day service, 90-day warranty.',
    cover:'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?w=800',
    services:[
      { name:'Phone Screen Repair', priceMin:35, priceMax:150, description:'Original and compatible screens for all brands' },
      { name:'Laptop Repair',       priceMin:20, priceMax:200, description:'Hardware and software repairs, data recovery' },
      { name:'Appliance Service',   priceMin:15, priceMax:80,  description:'Washing machine, fridge, TV servicing and repair' },
    ],
  },
  {
    name:'BrightMinds Tutoring Centre', email:'tutoring@example.com',
    type:'tutoring_centre', district:'Northside', phone:'+15550121', whatsapp:'+15550122',
    tagline:'Every child deserves to succeed',
    description:'Leading tutoring centre in Northside for secondary and pre-university subjects. Small class sizes, personalised attention.',
    cover:'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800',
    services:[
      { name:'Secondary Maths & Science', priceMin:30, priceMax:50, description:'Per month — 8 classes, 1.5 hours each' },
      { name:'Advanced Maths',  priceMin:40, priceMax:60, description:'Per month — 8 classes, 2 hours each' },
      { name:'English Language',    priceMin:25, priceMax:40, description:'Per month — conversational and exam preparation' },
    ],
  },
  {
    name:'Glamour Hair Salon',       email:'salon@example.com',
    type:'salon', district:'Downtown', phone:'+15550123', whatsapp:'+15550124',
    tagline:'Look your best every day',
    description:'Premium hair and beauty salon in the Downtown district. Services for men, women, and children.',
    cover:'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
    services:[
      { name:'Haircut & Styling',  priceMin:15,  priceMax:50,  description:'Cut, wash, and blow dry by senior stylist' },
      { name:'Hair Colour',        priceMin:50,  priceMax:200, description:'Global colour, highlights, or balayage' },
      { name:'Bridal Package',     priceMin:150, priceMax:400, description:'Hair, makeup, and styling for the big day' },
    ],
  },
];

// ─── Clients ──────────────────────────────────────────────────────────────────
const CLIENTS = [
  { name:'Alice Turner',       email:'alice@example.com',   district:'Downtown' },
  { name:'Ben Foster',        email:'ben@example.com',   district:'Hillview'   },
  { name:'Clara Vidal',     email:'clara@example.com',   district:'Northside' },
  { name:'David Kim',     email:'david@example.com',   district:'Harborview'   },
  { name:'Emma Lindqvist', email:'emma@example.com',  district:'Downtown' },
];

// ─── Service offer templates ──────────────────────────────────────────────────
const OFFER_TEMPLATES = {
  electrician:     [{ title:'Full House Wiring', priceMin:250, priceMax:800, desc:'Complete electrical wiring for new construction or rewiring', days:3 }, { title:'Fault Finding & Repair', priceMin:20, priceMax:60, desc:'Diagnose and fix any electrical fault', days:1 }],
  photographer:    [{ title:'Wedding Photography', priceMin:500, priceMax:1500, desc:'Full-day coverage — ceremony, reception, and portraits', days:14 }, { title:'Portrait Session', priceMin:80, priceMax:200, desc:'1-hour studio or outdoor portrait session', days:5 }],
  carpenter:       [{ title:'Built-in Wardrobe', priceMin:350, priceMax:1200, desc:'Custom built-in wardrobe with sliding doors', days:7 }, { title:'Kitchen Cabinets', priceMin:500, priceMax:2000, desc:'Full kitchen cabinet installation', days:10 }],
  mechanic:        [{ title:'Full Service', priceMin:80, priceMax:150, desc:'Oil, filters, belts, plugs — complete vehicle service', days:1 }, { title:'Engine Overhaul', priceMin:500, priceMax:1500, desc:'Full engine rebuild with warranty', days:7 }],
  plumber:         [{ title:'Bathroom Renovation', priceMin:200, priceMax:600, desc:'Full bathroom plumbing for renovation or new build', days:3 }, { title:'Leak Repair', priceMin:15, priceMax:50, desc:'Diagnose and fix any water leak', days:1 }],
  ac_technician:   [{ title:'AC Installation', priceMin:80, priceMax:150, desc:'Supply and install split unit AC with 1-year warranty', days:1 }, { title:'AC Service', priceMin:30, priceMax:50, desc:'Full cleaning, gas check, and performance test', days:1 }],
  tutor:           [{ title:'Advanced Maths — 1 Month', priceMin:80, priceMax:120, desc:'8 two-hour sessions, personalised study plan', days:30 }, { title:'Online Crash Course', priceMin:30, priceMax:60, desc:'4 intensive sessions for upcoming exams', days:7 }],
  painter:         [{ title:'Interior Painting', priceMin:150, priceMax:500, desc:'Full interior repaint including prep and 2 coats', days:3 }, { title:'Exterior Painting', priceMin:200, priceMax:800, desc:'External walls with weather-resistant paint', days:5 }],
  caterer:         [{ title:'Wedding Catering', priceMin:800, priceMax:3000, desc:'Full wedding buffet for up to 300 guests', days:1 }, { title:'Birthday Party', priceMin:250, priceMax:800, desc:'Food and setup for 50–100 guests', days:1 }],
  graphic_designer:[{ title:'Brand Identity', priceMin:150, priceMax:500, desc:'Logo, colour palette, fonts, and brand guide', days:7 }, { title:'Social Media Pack', priceMin:50, priceMax:150, desc:'10 social media post templates in your brand style', days:3 }],
};

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  let created = 0;
  let skipped = 0;

  // ── Admin ─────────────────────────────────────────────────────────────────
  const adminExists = await User.findOne({ email: 'admin@skillhub.example.com' });
  if (adminExists) {
    console.log('⏭  Admin already exists — skipped');
    skipped++;
  } else {
    const hash = await bcrypt.hash('Admin123!', 10);
    await User.create({ name:'Admin', email:'admin@skillhub.example.com', passwordHash:hash, role:'admin', phone:'+15550125' });
    console.log('👤 Admin created — admin@skillhub.example.com / Admin123!');
    created++;
  }

  // ── Workers ───────────────────────────────────────────────────────────────
  const workerHash = await bcrypt.hash('password123', 10);
  const now = new Date();
  const oneMonthLater = new Date(now); oneMonthLater.setMonth(now.getMonth() + 1);

  for (const w of WORKERS) {
    const exists = await User.findOne({ email: w.email });
    if (exists) { skipped++; process.stdout.write('⏭ '); continue; }

    const band = w.score >= 90 ? 'elite' : w.score >= 75 ? 'trusted' : w.score >= 55 ? 'rising' : w.score >= 35 ? 'probation' : 'new';
    const portfolioPhotos = w.plan !== 'free' ? getPortfolio(w.category) : [];

    const user = await User.create({
      name: w.name, email: w.email, passwordHash: workerHash, role: 'worker',
      phone: `1555${range(1000000, 9999999)}`,
      idVerified: w.idDoc, profilePhoto: avatar(w.slug),
      location: { district: w.district },
    });

    const profile = await WorkerProfile.create({
      userId: user._id, category: w.category, bio: w.bio,
      experienceYears: w.exp, languages: w.languages,
      dayRateMin: w.rateMin, dayRateMax: w.rateMax,
      skillScore: w.score, scoreBand: band,
      scoreBreakdown: {
        completionScore:     Math.min(100, w.score + range(0,8)),
        ratingScore:         Math.min(100, w.score + range(-5,5)),
        responsivenessScore: Math.min(100, w.score + range(0,12)),
        disputeScore:        w.score > 70 ? 100 : 80,
        trustScore:          w.idDoc ? 50 : 0,
      },
      totalJobsCompleted: Math.floor(w.exp * range(6,12)),
      totalRatings:       Math.floor(w.exp * range(4,8)),
      averageRating:      parseFloat((3.5 + (w.score/100)*1.5).toFixed(1)),
      tradeCertification: w.score > 80,
      acceptingWork: true,
      serviceDistricts: [w.district],
      portfolioPhotos,
      bioStatus: 'approved',
      subscriptionPlan: w.plan,
      subscriptionExpiry: w.plan !== 'free' ? oneMonthLater : null,
      featuredUntil: w.featured ? oneMonthLater : null,
      onboardingComplete: true,
      slug: generateSlug(w.name, w.category, w.district),
    });

    // Offers for pro/elite
    const templates = OFFER_TEMPLATES[w.category] || [];
    if (w.plan !== 'free') {
      for (const t of templates) {
        await WorkerOffer.create({
          workerId: profile._id, title: t.title, description: t.desc,
          priceMin: t.priceMin, priceMax: t.priceMax, deliveryDays: t.days,
          photos: getPortfolio(w.category).slice(0,2), isActive: true,
        });
      }
    }

    console.log(`🔨 Worker: ${w.name} (${w.plan}) — ${w.email}`);
    created++;
  }

  // ── Businesses ────────────────────────────────────────────────────────────
  const bizHash = await bcrypt.hash('password123', 10);
  for (const b of BUSINESSES) {
    const exists = await User.findOne({ email: b.email });
    if (exists) { skipped++; process.stdout.write('⏭ '); continue; }

    const user = await User.create({
      name: b.name, email: b.email, passwordHash: bizHash, role: 'business',
      phone: b.phone, profilePhoto: avatar(b.email.split('@')[0]),
      location: { district: b.district },
    });

    await BusinessProfile.create({
      userId: user._id, businessName: b.name, businessType: b.type,
      description: b.description, tagline: b.tagline, district: b.district,
      phone: b.phone, whatsapp: b.whatsapp, coverPhoto: b.cover,
      isVerified: true, isActive: true, onboardingComplete: true,
      slug: generateSlug(b.name, b.type, b.district),
      services: b.services.map(s => ({ name:s.name, description:s.description, priceMin:s.priceMin, priceMax:s.priceMax })),
      openingHours: { mon:'8:00 AM – 6:00 PM', tue:'8:00 AM – 6:00 PM', wed:'8:00 AM – 6:00 PM', thu:'8:00 AM – 6:00 PM', fri:'8:00 AM – 6:00 PM', sat:'9:00 AM – 4:00 PM', sun:'Closed' },
    });

    console.log(`🏪 Business: ${b.name} — ${b.email}`);
    created++;
  }

  // ── Clients ───────────────────────────────────────────────────────────────
  const clientHash = await bcrypt.hash('password123', 10);
  for (const c of CLIENTS) {
    const exists = await User.findOne({ email: c.email });
    if (exists) { skipped++; process.stdout.write('⏭ '); continue; }

    await User.create({
      name: c.name, email: c.email, passwordHash: clientHash, role: 'client',
      phone: `1555${range(1000000, 9999999)}`,
      location: { district: c.district },
    });

    console.log(`👤 Client: ${c.name} — ${c.email}`);
    created++;
  }

  console.log(`\n✅ Done — ${created} created, ${skipped} skipped (already existed)\n`);

  console.log('─────────────────────────────────────────────');
  console.log('TEST CREDENTIALS');
  console.log('─────────────────────────────────────────────');
  console.log('Admin:    admin@skillhub.example.com          / Admin123!');
  console.log('Worker:   daniel@example.com  / password123');
  console.log('Worker:   elena@example.com   / password123');
  console.log('Client:   alice@example.com     / password123');
  console.log('Client:   ben@example.com     / password123');
  console.log('Business: cleaners@example.com  / password123');
  console.log('Business: photo@example.com     / password123');
  console.log('─────────────────────────────────────────────\n');

  await mongoose.disconnect();
}

run().catch((e) => { console.error('❌', e); process.exit(1); });
