/**
 * SkillHub — Master Seed
 * ─────────────────────────
 * Wipes all collections and rebuilds from scratch.
 *
 *   cd server && node seeds/seed.js
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
import Job             from '../models/Job.js';
import Category        from '../models/Category.js';
import Subscription    from '../models/Subscription.js';
import Notification    from '../models/Notification.js';
import AuditLog        from '../models/AuditLog.js';
import ContactMessage  from '../models/ContactMessage.js';
import FeaturedRequest from '../models/FeaturedRequest.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../.env') });

// ─── Helpers ──────────────────────────────────────────────────────────────────
const pick  = (arr) => arr[Math.floor(Math.random() * arr.length)];
const range = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Reliable profile photo seeds (picsum.photos — consistent per seed name)
const avatar = (seed) => `https://picsum.photos/seed/${seed}/300/300`;

// Portfolio photos by category using reliable Unsplash URLs
// Keys use new canonical slugs (matching seedCategories.js)
const PORTFOLIO = {
  electrical_work:    ['https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=600','https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600','https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600'],
  plumbing:           ['https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?w=600','https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600','https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=600'],
  painting_decorating:['https://images.unsplash.com/photo-1562259929-b4e1fd3aef09?w=600','https://images.unsplash.com/photo-1589939705384-5185137a7f0f?w=600','https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600'],
  flooring:           ['https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=600','https://images.unsplash.com/photo-1590644365607-86ef5ef12036?w=600'],
  carpentry:          ['https://images.unsplash.com/photo-1601058272524-0611e132f3ce?w=600','https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=600','https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600'],
  cleaning_services:  ['https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=600','https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=600'],
  photography:        ['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600','https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=600','https://images.unsplash.com/photo-1542038784456-1ea8e935640e?w=600'],
  academic_tutoring:  ['https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=600','https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600'],
  hvac:               ['https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=600','https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600'],
  mobile_mechanic:    ['https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?w=600','https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600','https://images.unsplash.com/photo-1534274988757-a28bf1a57c17?w=600'],
  graphic_design:     ['https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600','https://images.unsplash.com/photo-1561070791-2526d30994b5?w=600'],
  catering:           ['https://images.unsplash.com/photo-1555244162-803834f70033?w=600','https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600','https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600'],
  default:            ['https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=600','https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=600'],
};
const getPortfolio = (cat) => PORTFOLIO[cat] || PORTFOLIO.default;

// ─── Categories ───────────────────────────────────────────────────────────────
// Minimal bootstrap set — slugs match seedCategories.js canonical list.
// Run `npm run seed:categories` after `npm run seed` to expand to all 141.
const SEED_CATEGORIES = [
  // Home & Property
  { name: 'Electrical Work',                     slug: 'electrical_work',         icon: '⚡', group: 'home_property' },
  { name: 'Plumbing',                            slug: 'plumbing',                icon: '🔧', group: 'home_property' },
  { name: 'Carpentry & Joinery',                 slug: 'carpentry',               icon: '🪚', group: 'home_property' },
  { name: 'Painting & Decorating',               slug: 'painting_decorating',     icon: '🖌️', group: 'home_property' },
  { name: 'Handyman Services',                   slug: 'handyman',                icon: '🔨', group: 'home_property' },
  { name: 'HVAC Installation & Repair',          slug: 'hvac',                    icon: '❄️', group: 'home_property' },
  { name: 'Roofing & Gutter Repair',             slug: 'roofing',                 icon: '🏗️', group: 'home_property' },
  { name: 'Flooring Installation',               slug: 'flooring',                icon: '🪵', group: 'home_property' },
  { name: 'Appliance Repair',                    slug: 'appliance_repair',        icon: '🔌', group: 'home_property' },
  { name: 'Cleaning Services',                   slug: 'cleaning_services',       icon: '🧹', group: 'home_property' },
  { name: 'Pest Control',                        slug: 'pest_control',            icon: '🐛', group: 'home_property' },
  { name: 'Locksmith',                           slug: 'locksmith',               icon: '🔑', group: 'home_property' },
  { name: 'Landscaping & Gardening',             slug: 'landscaping',             icon: '🌿', group: 'home_property' },

  // Technology & Digital
  { name: 'Web Development',                     slug: 'web_development',         icon: '🌐', group: 'technology_digital' },
  { name: 'UI/UX Design',                        slug: 'ui_ux_design',            icon: '🎨', group: 'technology_digital' },
  { name: 'SEO & Digital Marketing',             slug: 'seo_digital_marketing',   icon: '📈', group: 'technology_digital' },
  { name: 'Video Editing & Animation',           slug: 'video_editing',           icon: '🎬', group: 'technology_digital' },
  { name: 'Graphic Design',                      slug: 'graphic_design',          icon: '✏️', group: 'technology_digital' },
  { name: 'IT Support & Helpdesk',               slug: 'it_support',              icon: '🖥️', group: 'technology_digital' },
  { name: 'Tech Repair (Computer, Phone, Tablet)',slug: 'tech_repair',             icon: '🛠️', group: 'technology_digital' },

  // Education & Coaching
  { name: 'Academic Tutoring',                   slug: 'academic_tutoring',       icon: '📚', group: 'education_coaching' },
  { name: 'Language Lessons',                    slug: 'language_lessons',        icon: '🗣️', group: 'education_coaching' },
  { name: 'Test Preparation (SAT, GRE, IELTS…)', slug: 'test_preparation',        icon: '📄', group: 'education_coaching' },
  { name: 'Coding & Programming Tutoring',       slug: 'coding_tutoring',         icon: '💻', group: 'education_coaching' },

  // Events & Creative
  { name: 'Photography',                         slug: 'photography',             icon: '📷', group: 'events_creative' },
  { name: 'AV Equipment Rental & Setup',         slug: 'av_equipment',            icon: '🔊', group: 'events_creative' },
  { name: 'Event Planning & Coordination',       slug: 'event_planning',          icon: '📋', group: 'events_creative' },
  { name: 'Florist & Floral Decoration',         slug: 'florist',                 icon: '💐', group: 'events_creative' },
  { name: 'DJ & Live Music Booking',             slug: 'dj_music',                icon: '🎧', group: 'events_creative' },
  { name: 'Catering Services',                   slug: 'catering',                icon: '🍽️', group: 'events_creative' },

  // Beauty & Wellness
  { name: 'Makeup Application',                  slug: 'makeup_application',      icon: '💄', group: 'beauty_wellness' },
  { name: 'Haircut & Styling',                   slug: 'haircut_styling',         icon: '✂️', group: 'beauty_wellness' },
  { name: 'Massage Therapy',                     slug: 'massage_therapy',         icon: '💆', group: 'beauty_wellness' },
  { name: 'Nail Care',                           slug: 'nail_care',               icon: '💅', group: 'beauty_wellness' },
  { name: 'Yoga Instruction',                    slug: 'yoga',                    icon: '🧘', group: 'beauty_wellness' },

  // Health & Medical
  { name: 'Home Health Aide',                    slug: 'home_health_aide',        icon: '🤲', group: 'health_medical' },
  { name: 'Physical Therapy',                    slug: 'physical_therapy',        icon: '🦴', group: 'health_medical' },
  { name: 'Mobile Health Screening',             slug: 'health_screening',        icon: '🩺', group: 'health_medical' },
  { name: 'Nursing Care',                        slug: 'nursing_care',            icon: '🏥', group: 'health_medical' },
  { name: 'Medical Transport',                   slug: 'medical_transport',       icon: '🚑', group: 'health_medical' },

  // Automotive & Transport
  { name: 'Mobile Mechanic & Auto Repair',       slug: 'mobile_mechanic',         icon: '🔧', group: 'automotive_transport' },
  { name: 'Car Detailing',                       slug: 'car_detailing',           icon: '✨', group: 'automotive_transport' },
  { name: 'Moving Services',                     slug: 'moving_services',         icon: '🚚', group: 'automotive_transport' },
  { name: 'Delivery Services',                   slug: 'delivery_services',       icon: '📦', group: 'automotive_transport' },
  { name: 'Towing & Roadside Assistance',        slug: 'towing',                  icon: '🚨', group: 'automotive_transport' },
  { name: 'Chauffeur & Limousine Service',       slug: 'chauffeur',               icon: '🎩', group: 'automotive_transport' },

  // Business & Professional
  { name: 'Accounting & Bookkeeping',            slug: 'accounting',              icon: '💰', group: 'business_professional' },
  { name: 'Legal Consultation',                  slug: 'legal_consultation',      icon: '⚖️', group: 'business_professional' },

  // Lifestyle & Leisure
  { name: 'Interior Design Consultation',        slug: 'interior_design',         icon: '🏡', group: 'lifestyle_leisure' },
  { name: 'Wardrobe Styling & Fashion Consulting',slug: 'wardrobe_styling',        icon: '👗', group: 'lifestyle_leisure' },
  { name: 'Pet Grooming',                        slug: 'pet_grooming',            icon: '🐾', group: 'lifestyle_leisure' },
  { name: 'Art & Craft Workshops',               slug: 'art_craft_workshops',     icon: '🎨', group: 'lifestyle_leisure' },
  { name: 'Tour Guiding',                        slug: 'tour_guiding',            icon: '🗺️', group: 'lifestyle_leisure' },
  { name: 'Cooking Classes',                     slug: 'cooking_classes',         icon: '🍳', group: 'lifestyle_leisure' },
  { name: 'Errand Running & Concierge',          slug: 'errand_concierge',        icon: '🏃', group: 'lifestyle_leisure' },
];

// ─── Worker data ──────────────────────────────────────────────────────────────
const WORKERS = [
  // Elite / featured — top of platform
  {
    name: 'Daniel Brooks', email: 'daniel@example.com', slug: 'daniel',
    category: 'electrical_work', district: 'Downtown',  exp: 15, rateMin: 50, rateMax: 90,
    score: 96, plan: 'elite', idDoc: true,
    bio: 'Master electrician with 15 years of residential and commercial experience. Fully licensed by the national electrical board. Same-day service available in Downtown.',
    languages: ['English', 'Spanish'],
    featured: true,
  },
  {
    name: 'Elena Rivera',  email: 'elena@example.com',  slug: 'elena',
    category: 'photography',   district: 'Downtown',  exp: 8,  rateMin: 150, rateMax: 500,
    score: 93, plan: 'elite', idDoc: true,
    bio: 'Award-winning photographer specialising in weddings, corporate events, and portraits. Over 500 events covered across the region. Full-frame mirrorless kit and professional lighting.',
    languages: ['English', 'Spanish', 'French'],
    featured: true,
  },
  {
    name: 'Marcus Chen',        email: 'marcus@example.com',    slug: 'marcus',
    category: 'carpentry',     district: 'Northside', exp: 12, rateMin: 40, rateMax: 70,
    score: 91, plan: 'elite', idDoc: true,
    bio: 'Custom furniture maker and interior carpenter. Specialise in built-in wardrobes, kitchen cabinets, and luxury bedroom sets. Workshop in Northside with free delivery within 30km.',
    languages: ['English'],
    featured: true,
  },
  {
    name: 'Omar Haddad',    email: 'omar@example.com',   slug: 'omar',
    category: 'mobile_mechanic', district: 'Hillview',  exp: 10, rateMin: 30, rateMax: 60,
    score: 89, plan: 'elite', idDoc: true,
    bio: 'Certified auto mechanic specialising in Japanese and European vehicles. Full diagnostic equipment, engine overhauls, and gearbox repairs. 20,000+ km warranty on all work.',
    languages: ['English', 'Spanish'],
    featured: true,
  },

  // Pro plan workers
  {
    name: 'Priya Nair',       email: 'priya@example.com',    slug: 'priya',
    category: 'plumbing',      district: 'Downtown',  exp: 9,  rateMin: 30, rateMax: 55,
    score: 86, plan: 'pro', idDoc: true,
    bio: 'Experienced plumber handling all types of residential and commercial plumbing. Specialise in bathroom renovations, pipe replacements, and solar water heater installation.',
    languages: ['English', 'Spanish'],
  },
  {
    name: 'Tomas Novak',      email: 'tomas@example.com',  slug: 'tomas',
    category: 'hvac',          district: 'Downtown',  exp: 7,  rateMin: 35, rateMax: 60,
    score: 84, plan: 'pro', idDoc: true,
    bio: 'Authorised service agent for all major air-conditioner brands. Installation, servicing, gas refill, and repair. Call-out service 7 days a week.',
    languages: ['English', 'Spanish'],
  },
  {
    name: 'Aisha Bello',    email: 'aisha@example.com',slug: 'aisha',
    category: 'academic_tutoring', district: 'Hillview', exp: 6,  rateMin: 20, rateMax: 40,
    score: 82, plan: 'pro', idDoc: true,
    bio: 'High-school Mathematics and Physics tutor with 6 years of experience. Former lecturer at a leading tuition institute. 95% of my students score B or above. Home visits and online sessions.',
    languages: ['English', 'Spanish'],
  },
  {
    name: 'Lucas Moreau',     email: 'lucas@example.com',   slug: 'lucas',
    category: 'painting_decorating', district: 'Northside', exp: 6,  rateMin: 25, rateMax: 45,
    score: 80, plan: 'pro', idDoc: true,
    bio: 'Interior and exterior painting professional. Use only premium trade paints. Includes surface preparation, crack filling, and 2-coat finish. Clean, neat, and on time.',
    languages: ['English'],
  },
  {
    name: 'Sofia Rossi',email: 'sofia@example.com',    slug: 'sofia',
    category: 'catering',      district: 'Harborview',    exp: 8,  rateMin: 80, rateMax: 300,
    score: 78, plan: 'pro', idDoc: true,
    bio: 'Full-service caterer for weddings, corporate events, and birthday parties. Specialise in Mediterranean and Asian cuisine. Can serve 20–500 guests. All equipment and staff provided.',
    languages: ['English', 'Spanish'],
  },
  {
    name: 'Noah Weber', email: 'noah@example.com',  slug: 'noah',
    category: 'graphic_design', district: 'Downtown', exp: 5,  rateMin: 50, rateMax: 200,
    score: 77, plan: 'pro', idDoc: true,
    bio: 'Brand identity designer and digital illustrator. Specialise in logos, packaging, social media graphics, and print materials. Industry-standard design tooling. Unlimited revisions until satisfied.',
    languages: ['English', 'Spanish'],
  },

  // Free plan workers — new and growing
  {
    name: 'Jonas Vogel',   email: 'jonas@example.com',   slug: 'jonas',
    category: 'flooring',        district: 'Harborview',    exp: 4,  rateMin: 30, rateMax: 50,
    score: 68, plan: 'free', idDoc: false,
    bio: 'General mason and construction worker available for tile fixing, rendering, and minor structural work. Honest pricing, reliable service.',
    languages: ['English'],
  },
  {
    name: 'Maya Okafor', email: 'maya@example.com',  slug: 'maya',
    category: 'cleaning_services', district: 'Northside', exp: 3,  rateMin: 15, rateMax: 30,
    score: 62, plan: 'free', idDoc: false,
    bio: 'Professional house cleaner. Deep cleaning, move-in/move-out cleaning, and regular weekly service. Bring my own equipment and eco-friendly products.',
    languages: ['English'],
  },
  {
    name: 'Diego Alvarez',   email: 'diego@example.com',   slug: 'diego',
    category: 'flooring',        district: 'Lakeside',   exp: 5,  rateMin: 25, rateMax: 40,
    score: 65, plan: 'free', idDoc: true,
    bio: 'Floor and wall tiler with 5 years experience. Bathroom renovations, kitchen backsplash, and outdoor paving. Own tools, competitive rates.',
    languages: ['English'],
  },
  {
    name: 'Ethan Clarke',    email: 'ethan@example.com',     slug: 'ethan',
    category: 'landscaping',     district: 'Hillview',    exp: 4,  rateMin: 15, rateMax: 25,
    score: 59, plan: 'free', idDoc: false,
    bio: 'Experienced gardener offering lawn mowing, tree trimming, garden design, and maintenance. Available for one-off or regular garden care.',
    languages: ['English'],
  },
  {
    name: 'Leila Karam',  email: 'leila@example.com',  slug: 'leila',
    category: 'makeup_application', district: 'Downtown',  exp: 3,  rateMin: 50, rateMax: 150,
    score: 71, plan: 'free', idDoc: true,
    bio: 'Bridal and event makeup artist. Specialise in traditional and contemporary bridal looks. Available for home visits across Downtown and Northside. Trial sessions available.',
    languages: ['English', 'Spanish'],
  },
  {
    name: 'Viktor Petrov',email: 'viktor@example.com',slug: 'viktor',
    category: 'chauffeur',       district: 'Downtown',  exp: 7,  rateMin: 25, rateMax: 50,
    score: 74, plan: 'free', idDoc: true,
    bio: 'Professional chauffeur with 7 years experience. Airport transfers, wedding car hire, intercity travel, and monthly contracts. Air-conditioned sedan and SUV available.',
    languages: ['English', 'Spanish'],
  },
  {
    name: 'Hannah Berg', email: 'hannah@example.com',  slug: 'hannah',
    category: 'cooking_classes', district: 'Northside', exp: 5,  rateMin: 20, rateMax: 40,
    score: 66, plan: 'free', idDoc: false,
    bio: 'Home cook specialising in traditional regional cuisine. Available for daily cooking, party cooking, and special occasion meals. Grocery shopping service included.',
    languages: ['English'],
  },
  {
    name: 'Felix Andersen',    email: 'felix@example.com',    slug: 'felix',
    category: 'electrical_work', district: 'Rosewood',exp:3, rateMin: 25, rateMax: 40,
    score: 58, plan: 'free', idDoc: false,
    bio: 'Electrician available for domestic wiring, switch and socket repairs, and fan installations. Reasonable rates, fast service in Rosewood area.',
    languages: ['English'],
  },
  {
    name: 'Ravi Kapoor',    email: 'ravi@example.com', slug: 'ravi',
    category: 'tech_repair',     district: 'Downtown',  exp: 2,  rateMin: 20, rateMax: 50,
    score: 52, plan: 'free', idDoc: false,
    bio: 'IT support technician. Laptop and PC repair, virus removal, software installation, network setup, and CCTV installation. Home visits available.',
    languages: ['English', 'Spanish'],
  },
  {
    name: 'Grace Mensah',       email: 'grace@example.com',   slug: 'grace',
    category: 'nursing_care',    district: 'Downtown',  exp: 6,  rateMin: 30, rateMax: 60,
    score: 79, plan: 'free', idDoc: true,
    bio: 'Registered nurse offering home care for elderly patients and post-operative recovery. Medication management, wound care, and physiotherapy assistance. 24-hour availability.',
    languages: ['English', 'Spanish', 'French'],
  },
];

// ─── Business data ────────────────────────────────────────────────────────────
const BUSINESSES = [
  {
    name: 'Downtown Pro Cleaners',  email: 'cleaners@example.com',
    type: 'cleaning_company', district: 'Downtown',
    tagline: 'Spotless spaces, every time',
    description: 'Professional cleaning company serving residential and commercial clients across Downtown. Teams of 3–8 cleaners, fully equipped with industrial-grade machinery. Monthly contracts available.',
    phone: '+15550100', whatsapp: '+15550101',
    cover: 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?w=800',
    photos: [
      'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=600',
      'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=600',
      'https://images.unsplash.com/photo-1527515545081-5db817172677?w=600',
      'https://images.unsplash.com/photo-1585421514738-01798e348b17?w=600',
    ],
    services: [
      { name: 'Deep House Clean',    priceMin: 50,  priceMax: 150, description: 'Full house deep clean including all rooms and bathrooms' },
      { name: 'Office Cleaning',     priceMin: 80,  priceMax: 300, description: 'Daily or weekly office cleaning service' },
      { name: 'Post-Construction',   priceMin: 150, priceMax: 500, description: 'Dust and debris removal after renovation work' },
      { name: 'Carpet Cleaning',     priceMin: 20,  priceMax: 80,  description: 'Steam cleaning for all carpet types' },
      { name: 'Window Cleaning',     priceMin: 15,  priceMax: 60,  description: 'Interior and exterior glass cleaning' },
    ],
  },
  {
    name: 'Hillview Studio Photography', email: 'photo@example.com',
    type: 'photography_studio', district: 'Hillview',
    tagline: 'Capturing your most precious moments',
    description: 'Award-winning photography studio in Hillview. Weddings, pre-shoots, product photography, and corporate events. State-of-the-art studio with outdoor locations across the surrounding countryside.',
    phone: '+15550102', whatsapp: '+15550103',
    cover: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
    photos: [
      'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=600',
      'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=600',
      'https://images.unsplash.com/photo-1591604021695-0c69b7c05981?w=600',
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=600',
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600',
    ],
    services: [
      { name: 'Wedding Photography', priceMin: 500, priceMax: 1500, description: 'Full-day wedding coverage with 500+ edited photos' },
      { name: 'Pre-shoot Package',   priceMin: 150, priceMax: 350,  description: '2-hour outdoor pre-shoot with 100 edited photos' },
      { name: 'Product Photography', priceMin: 50,  priceMax: 200,  description: 'Studio product shots for e-commerce and social media' },
      { name: 'Portrait Session',    priceMin: 80,  priceMax: 180,  description: '1-hour studio portrait session, 50 edited photos' },
      { name: 'Event Photography',   priceMin: 200, priceMax: 600,  description: 'Corporate events, parties, and ceremonies' },
    ],
  },
  {
    name: 'Harborview Catering Co.',    email: 'catering@example.com',
    type: 'catering', district: 'Harborview',
    tagline: 'Authentic regional flavours for every occasion',
    description: 'Family-run catering business with 20 years of experience. Specialise in traditional wedding menus, corporate events, and private parties. Serving up to 2,000 guests.',
    phone: '+15550104', whatsapp: '+15550105',
    cover: 'https://images.unsplash.com/photo-1555244162-803834f70033?w=800',
    photos: [
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600',
      'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600',
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600',
      'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600',
    ],
    services: [
      { name: 'Wedding Buffet',     priceMin: 8,  priceMax: 20,  description: 'Per head — full hot buffet with mains, sides and desserts' },
      { name: 'Corporate Lunch',    priceMin: 5,  priceMax: 12,  description: 'Per head — box lunch or buffet for office events' },
      { name: 'Birthday Party',     priceMin: 250,priceMax: 800, description: 'Full setup, food, and service for 50–200 guests' },
      { name: 'Breakfast Platter', priceMin: 4,  priceMax: 6,   description: 'Per head — traditional breakfast set' },
      { name: 'BBQ Night',          priceMin: 12, priceMax: 25,  description: 'Per head — grilled meats, seafood, and sides' },
    ],
  },
  {
    name: 'SmartFix Repair Shop',  email: 'repair@example.com',
    type: 'repair_shop', district: 'Downtown',
    tagline: 'All electronics repaired — fast and affordable',
    description: 'Electronics and appliance repair centre in the Downtown district. Mobile phones, laptops, TVs, washing machines, refrigerators, and more. Same-day service on most repairs. 90-day warranty on all work.',
    phone: '+15550106', whatsapp: '+15550107',
    cover: 'https://images.unsplash.com/photo-1530046339160-ce3e530c7d2f?w=800',
    photos: [
      'https://images.unsplash.com/photo-1588508065123-287b28e013da?w=600',
      'https://images.unsplash.com/photo-1601972599720-36938d4ecd31?w=600',
      'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=600',
      'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600',
    ],
    services: [
      { name: 'Phone Screen Repair', priceMin: 35, priceMax: 150, description: 'Original and compatible screens for all brands' },
      { name: 'Laptop Repair',       priceMin: 20, priceMax: 200, description: 'Hardware and software repairs, data recovery' },
      { name: 'Appliance Service',   priceMin: 15, priceMax: 80,  description: 'Washing machine, fridge, TV servicing and repair' },
      { name: 'Battery Replacement', priceMin: 15, priceMax: 60,  description: 'Genuine batteries for phones and laptops' },
      { name: 'Data Recovery',       priceMin: 30, priceMax: 150, description: 'Recover lost data from phones, laptops, hard drives' },
    ],
  },
  {
    name: 'BrightMinds Tutoring Centre', email: 'tutoring@example.com',
    type: 'tutoring_centre', district: 'Northside',
    tagline: 'Every child deserves to succeed',
    description: 'Leading tutoring centre in Northside with qualified teachers for secondary and pre-university subjects. Small class sizes (max 8 students), personalised attention, and monthly progress reports.',
    phone: '+15550108', whatsapp: '+15550109',
    cover: 'https://images.unsplash.com/photo-1580582932707-520aed937b7b?w=800',
    photos: [
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=600',
      'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=600',
      'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600',
      'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600',
    ],
    services: [
      { name: 'Secondary Maths & Science', priceMin: 30, priceMax: 50,  description: 'Per month — 8 classes, 1.5 hours each' },
      { name: 'Advanced Maths',  priceMin: 40, priceMax: 60,  description: 'Per month — 8 classes, 2 hours each' },
      { name: 'English Language',    priceMin: 25, priceMax: 40,  description: 'Per month — conversational and exam preparation' },
      { name: 'Grade 1–5 Tuition',   priceMin: 20, priceMax: 35,  description: 'Per month — all subjects, primary level' },
      { name: 'ICT / Computing',     priceMin: 30, priceMax: 50,  description: 'Per month — secondary and pre-university IT preparation' },
    ],
  },
  {
    name: 'Glamour Hair Salon',    email: 'salon@example.com',
    type: 'salon', district: 'Downtown',
    tagline: 'Look your best every day',
    description: 'Premium hair and beauty salon in the Downtown district. Expert stylists, imported products, and a relaxing atmosphere. Services for men, women, and children. Walk-ins welcome.',
    phone: '+15550110', whatsapp: '+15550111',
    cover: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800',
    photos: [
      'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600',
      'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=600',
      'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600',
      'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=600',
      'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600',
    ],
    services: [
      { name: 'Haircut & Styling',   priceMin: 15,  priceMax: 50,  description: 'Cut, wash, and blow dry by senior stylist' },
      { name: 'Hair Colour',         priceMin: 50,  priceMax: 200, description: 'Global colour, highlights, or balayage' },
      { name: 'Bridal Package',      priceMin: 150, priceMax: 400, description: 'Hair, makeup, and styling for the big day' },
      { name: 'Keratin Treatment',   priceMin: 80,  priceMax: 250, description: 'Smoothing treatment for frizz-free hair' },
      { name: 'Facial & Cleanup',    priceMin: 25,  priceMax: 80,  description: 'Deep cleansing facial with premium products' },
    ],
  },
];

// ─── Client data ──────────────────────────────────────────────────────────────
const CLIENTS = [
  { name: 'Alice Turner',    email: 'alice@example.com',   district: 'Downtown'  },
  { name: 'Ben Foster',     email: 'ben@example.com',   district: 'Hillview'    },
  { name: 'Clara Vidal',  email: 'clara@example.com',   district: 'Northside'  },
  { name: 'David Kim',  email: 'david@example.com',   district: 'Harborview'    },
  { name: 'Emma Lindqvist',email:'emma@example.com', district: 'Downtown'  },
];

// ─── Main seed ────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  // ── Wipe everything ───────────────────────────────────────────────────────
  await Promise.all([
    User.deleteMany({}),
    WorkerProfile.deleteMany({}),
    WorkerOffer.deleteMany({}),
    BusinessProfile.deleteMany({}),
    Job.deleteMany({}),
    Category.deleteMany({}),
    Subscription.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
    ContactMessage.deleteMany({}),
    FeaturedRequest.deleteMany({}),
  ]);
  console.log('🗑  All collections cleared\n');

  // ── Categories ────────────────────────────────────────────────────────────
  await Category.insertMany(SEED_CATEGORIES);
  console.log(`📂 ${SEED_CATEGORIES.length} categories seeded\n`);

  // ── Admin ─────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('Admin123!', 10);
  await User.create({
    name: 'Admin',
    email: 'admin@skillhub.example.com',
    passwordHash: adminHash,
    role: 'admin',
    phone: '+15550112',
  });
  console.log('👤 Admin created — admin@skillhub.example.com / Admin123!');

  // ── Clients ───────────────────────────────────────────────────────────────
  const clientHash  = await bcrypt.hash('password123', 10);
  const clientUsers = [];
  for (const c of CLIENTS) {
    const u = await User.create({
      name: c.name,
      email: c.email,
      passwordHash: clientHash,
      role: 'client',
      phone: `1555${range(1000000, 9999999)}`,
      location: { district: c.district },
    });
    clientUsers.push(u);
  }
  console.log(`👥 ${CLIENTS.length} clients created`);

  // ── Workers ───────────────────────────────────────────────────────────────
  const workerHash    = await bcrypt.hash('password123', 10);
  const workerUserMap = {};

  const now = new Date();
  const oneMonthLater = new Date(now);
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

  for (const w of WORKERS) {
    // Create user
    const user = await User.create({
      name: w.name,
      email: w.email,
      passwordHash: workerHash,
      role: 'worker',
      phone: `1555${range(1000000, 9999999)}`,
      idVerified: w.idDoc,
      profilePhoto: avatar(w.slug),
      location: { district: w.district },
      socialLinks: {
        facebook:  w.score > 75 ? `https://facebook.com/${w.slug}` : '',
        instagram: w.score > 70 ? `https://instagram.com/${w.slug}` : '',
      },
    });

    const band =
      w.score >= 90 ? 'elite'    :
      w.score >= 75 ? 'trusted'  :
      w.score >= 55 ? 'rising'   :
      w.score >= 35 ? 'probation': 'new';

    // Portfolio photos
    const portfolioPhotos = w.plan !== 'free' ? getPortfolio(w.category) : [];

    // Create worker profile
    const profile = await WorkerProfile.create({
      userId:             user._id,
      category:           w.category,
      bio:                w.bio,
      experienceYears:    w.exp,
      languages:          w.languages,
      dayRateMin:         w.rateMin,
      dayRateMax:         w.rateMax,
      skillScore:         w.score,
      scoreBand:          band,
      scoreBreakdown: {
        completionScore:     Math.min(100, w.score + range(0, 8)),
        ratingScore:         Math.min(100, w.score + range(-5, 5)),
        responsivenessScore: Math.min(100, w.score + range(0, 12)),
        disputeScore:        w.score > 70 ? 100 : 80,
        trustScore:          w.idDoc ? 50 : 0,
      },
      totalJobsCompleted:  Math.floor(w.exp * range(6, 12)),
      totalRatings:        Math.floor(w.exp * range(4, 8)),
      averageRating:       parseFloat((3.5 + (w.score / 100) * 1.5).toFixed(1)),
      tradeCertification:  w.score > 80,
      acceptingWork:       true,
      serviceDistricts:    [w.district],
      portfolioPhotos,
      bioStatus:           'approved',
      subscriptionPlan:    w.plan,
      subscriptionExpiry:  w.plan !== 'free' ? oneMonthLater : null,
      featuredUntil:       w.featured ? oneMonthLater : null,
      onboardingComplete:  true,
      slug:                generateSlug(w.name, w.category, w.district),
    });

    // Service offers for pro/elite
    if (w.plan !== 'free' && w.category) {
      const offerTemplates = {
        electrical_work:    [{ title: 'Full House Wiring',     priceMin: 250, priceMax: 800, desc: 'Complete electrical wiring for new construction or rewiring', days: 3 }, { title: 'Fault Finding & Repair', priceMin: 20, priceMax: 60, desc: 'Diagnose and fix any electrical fault', days: 1 }],
        photography:        [{ title: 'Wedding Photography',   priceMin: 500, priceMax: 1500,desc: 'Full-day coverage — ceremony, reception, and portraits', days: 14 }, { title: 'Portrait Session', priceMin: 80, priceMax: 200, desc: '1-hour studio or outdoor portrait session', days: 5 }],
        carpentry:          [{ title: 'Built-in Wardrobe',     priceMin: 350, priceMax: 1200,desc: 'Custom built-in wardrobe with sliding doors and internal fittings', days: 7 }, { title: 'Kitchen Cabinets', priceMin: 500, priceMax: 2000,desc: 'Full kitchen cabinet installation', days: 10 }],
        mobile_mechanic:    [{ title: 'Full Service',          priceMin: 80,  priceMax: 150, desc: 'Oil, filters, belts, plugs — complete vehicle service', days: 1 }, { title: 'Engine Overhaul', priceMin: 500, priceMax: 1500,desc: 'Full engine rebuild with warranty', days: 7 }],
        plumbing:           [{ title: 'Bathroom Renovation',   priceMin: 200, priceMax: 600, desc: 'Full bathroom plumbing for renovation or new build', days: 3 }, { title: 'Leak Repair', priceMin: 15, priceMax: 50, desc: 'Diagnose and fix any water leak', days: 1 }],
        hvac:               [{ title: 'AC Installation',       priceMin: 80,  priceMax: 150, desc: 'Supply and install split unit AC with 1-year warranty', days: 1 }, { title: 'AC Service', priceMin: 30, priceMax: 50, desc: 'Full cleaning, gas check, and performance test', days: 1 }],
        academic_tutoring:  [{ title: 'Advanced Maths — 1 Month',  priceMin: 80,  priceMax: 120, desc: '8 two-hour sessions, personalised study plan included', days: 30 }, { title: 'Online Crash Course', priceMin: 30, priceMax: 60, desc: '4 intensive sessions for upcoming exams', days: 7 }],
        painting_decorating:[{ title: 'Interior Painting',     priceMin: 150, priceMax: 500, desc: 'Full interior repaint including prep and 2 coats', days: 3 }, { title: 'Exterior Painting', priceMin: 200, priceMax: 800, desc: 'External walls with weather-resistant paint', days: 5 }],
        catering:           [{ title: 'Wedding Catering',      priceMin: 800, priceMax: 3000,desc: 'Full wedding buffet for up to 300 guests', days: 1 }, { title: 'Birthday Party', priceMin: 250, priceMax: 800, desc: 'Food and setup for 50–100 guests', days: 1 }],
        graphic_design:     [{ title: 'Brand Identity',        priceMin: 150, priceMax: 500, desc: 'Logo, colour palette, fonts, and brand guide', days: 7 }, { title: 'Social Media Pack', priceMin: 50, priceMax: 150, desc: '10 social media post templates in your brand style', days: 3 }],
      };
      const templates = offerTemplates[w.category] || [];
      for (const t of templates) {
        await WorkerOffer.create({
          workerId:     profile._id,
          title:        t.title,
          description:  t.desc,
          priceMin:     t.priceMin,
          priceMax:     t.priceMax,
          deliveryDays: t.days,
          photos:       getPortfolio(w.category).slice(0, 2),
          isActive:     true,
        });
      }
    }

    workerUserMap[w.email] = { user, profile };
  }
  console.log(`🔨 ${WORKERS.length} workers created (${WORKERS.filter(w=>w.featured).length} featured, ${WORKERS.filter(w=>w.plan==='elite').length} elite, ${WORKERS.filter(w=>w.plan==='pro').length} pro)`);

  // ── Businesses ────────────────────────────────────────────────────────────
  const bizHash = await bcrypt.hash('password123', 10);
  for (const b of BUSINESSES) {
    const user = await User.create({
      name: b.name,
      email: b.email,
      passwordHash: bizHash,
      role: 'business',
      phone: b.phone,
      profilePhoto: avatar(b.email.split('@')[0]),
      location: { district: b.district },
    });

    await BusinessProfile.create({
      userId:           user._id,
      businessName:     b.name,
      businessType:     b.type,
      description:      b.description,
      tagline:          b.tagline,
      district:         b.district,
      phone:            b.phone,
      whatsapp:         b.whatsapp,
      coverPhoto:       b.cover,
      photos:           b.photos || [],
      isVerified:       true,
      isActive:         true,
      onboardingComplete: true,
      slug:             generateSlug(b.name, b.type, b.district),
      services:         b.services.map((s) => ({
        name:        s.name,
        description: s.description,
        priceMin:    s.priceMin,
        priceMax:    s.priceMax,
      })),
      openingHours: {
        mon: '8:00 AM – 6:00 PM', tue: '8:00 AM – 6:00 PM',
        wed: '8:00 AM – 6:00 PM', thu: '8:00 AM – 6:00 PM',
        fri: '8:00 AM – 6:00 PM', sat: '9:00 AM – 4:00 PM',
        sun: 'Closed',
      },
    });
  }
  console.log(`🏪 ${BUSINESSES.length} businesses created\n`);

  // ── Completed jobs with reviews ────────────────────────────────────────────
  const jobData = [
    { workerEmail: 'daniel@example.com', clientIdx: 0, category: 'electrical_work', title: 'Rewire kitchen and install new sockets', rate: 180, rating: 5, review: 'Excellent work! Very professional and clean. Finished ahead of schedule.', workerReview: 'Great client, clear requirements and paid promptly.' },
    { workerEmail: 'elena@example.com',  clientIdx: 1, category: 'photography', title: 'Wedding photography — full day', rate: 850, rating: 5, review: 'The photos are absolutely stunning. Elena captured every moment perfectly. Highly recommend!', workerReview: 'Beautiful venue and lovely couple. A pleasure to work with.' },
    { workerEmail: 'marcus@example.com',    clientIdx: 2, category: 'carpentry', title: 'Built-in wardrobe for master bedroom', rate: 650, rating: 5, review: 'Marcus built exactly what we wanted. Quality craftsmanship and very fair pricing.', workerReview: 'Client knew exactly what they wanted. Smooth project.' },
    { workerEmail: 'priya@example.com',    clientIdx: 3, category: 'plumbing', title: 'Bathroom pipe replacement and new shower', rate: 220, rating: 4, review: 'Good work overall, slight delay but quality is excellent.', workerReview: 'Nice client, minor complications with old pipes but resolved well.' },
    { workerEmail: 'tomas@example.com',  clientIdx: 4, category: 'hvac', title: 'Install 2 AC units in bedrooms', rate: 240, rating: 5, review: 'Very punctual and efficient. Both units working perfectly. Will call again.', workerReview: 'Easy installation, client very happy.' },
    { workerEmail: 'aisha@example.com',clientIdx: 0, category: 'academic_tutoring', title: 'Advanced Maths tuition — 3 months', rate: 180, rating: 5, review: 'My son improved from a C to an A grade. Aisha explains things so clearly.', workerReview: 'Hardworking student. A pleasure to teach.' },
    { workerEmail: 'omar@example.com',   clientIdx: 1, category: 'mobile_mechanic', title: 'Full engine overhaul — family saloon', rate: 950, rating: 4, review: 'Very thorough job. Car runs like new. Honest about what work was actually needed.', workerReview: 'Big job but went smoothly. Client appreciated the transparency.' },
    { workerEmail: 'sofia@example.com',    clientIdx: 2, category: 'catering', title: 'Wedding catering for 200 guests', rate: 1600, rating: 5, review: 'Food was absolutely delicious! All our guests were asking for the caterer contact. Thank you!', workerReview: 'Large event but well organised. Great family to work with.' },
  ];

  for (const j of jobData) {
    const workerUser = workerUserMap[j.workerEmail]?.user;
    if (!workerUser) continue;
    const client = clientUsers[j.clientIdx];
    const scheduledDate = new Date(Date.now() - range(7, 60) * 86_400_000);

    await Job.create({
      clientId:        client._id,
      workerId:        workerUser._id,
      category:        j.category,
      title:           j.title,
      description:     j.title,
      location:        { district: client.location?.district || 'Downtown', address: `${range(10, 99)} Main Road` },
      scheduledDate,
      status:          'completed',
      agreedRate:      j.rate,
      depositAmount:   Math.round(j.rate * 0.3),
      remainingAmount: 0,
      depositPaid:     true,
      finalPaid:       true,
      clientRating:    j.rating,
      clientReview:    j.review,
      workerRating:    5,
      workerReview:    j.workerReview,
      completedAt:     new Date(scheduledDate.getTime() + 86_400_000 * range(1, 3)),
    });
  }
  console.log(`💼 ${jobData.length} completed jobs with reviews created\n`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('══════════════════════════════════════════════════════════');
  console.log('  SkillHub Seed Complete');
  console.log('══════════════════════════════════════════════════════════');
  console.log('  Admin   → admin@skillhub.example.com   / Admin123!');
  console.log('  Workers → [any]@example.com / password123');
  console.log('  Clients → [any]@example.com / password123');
  console.log('──────────────────────────────────────────────────────────');
  console.log(`  ${SEED_CATEGORIES.length} categories | ${WORKERS.length} workers | ${BUSINESSES.length} businesses | ${CLIENTS.length} clients`);
  console.log(`  ${jobData.length} completed jobs | ${WORKERS.filter(w=>w.featured).length} featured workers`);
  console.log('══════════════════════════════════════════════════════════\n');

  process.exit(0);
}

seed().catch((err) => { console.error('❌ Seed error:', err); process.exit(1); });
