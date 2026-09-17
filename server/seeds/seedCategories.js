/**
 * seedCategories.js — Full category reseed (141 categories across 9 groups)
 *
 * Default: wipes all categories and inserts fresh list.
 * Pass --upsert to merge instead (safe when worker profiles exist).
 *
 * Run seedGroups.js first so group slugs exist in the DB.
 *
 * Usage:
 *   node seeds/seedCategories.js           ← full replace
 *   node seeds/seedCategories.js --upsert  ← merge only
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Category         from '../models/Category.js';
import WorkerProfile    from '../models/WorkerProfile.js';
import PlatformSettings from '../models/PlatformSettings.js';

const UPSERT_ONLY = process.argv.includes('--upsert');

// group slugs must match what seedGroups.js inserted
const SEED_CATEGORIES = [

  // ── 1. Home & Property (18) ──────────────────────────────────────────────
  { name: 'Plumbing',                              slug: 'plumbing',                    icon: '🔧', group: 'home_property' },
  { name: 'Electrical Work',                       slug: 'electrical_work',             icon: '⚡', group: 'home_property' },
  { name: 'Carpentry & Joinery',                   slug: 'carpentry',                   icon: '🪚', group: 'home_property' },
  { name: 'Painting & Decorating',                 slug: 'painting_decorating',         icon: '🖌️', group: 'home_property' },
  { name: 'Handyman Services',                     slug: 'handyman',                    icon: '🔨', group: 'home_property' },
  { name: 'HVAC Installation & Repair',            slug: 'hvac',                        icon: '❄️', group: 'home_property' },
  { name: 'Roofing & Gutter Repair',               slug: 'roofing',                     icon: '🏗️', group: 'home_property' },
  { name: 'Flooring Installation',                 slug: 'flooring',                    icon: '🪵', group: 'home_property' },
  { name: 'Appliance Repair',                      slug: 'appliance_repair',            icon: '🔌', group: 'home_property' },
  { name: 'Cleaning Services',                     slug: 'cleaning_services',           icon: '🧹', group: 'home_property' },
  { name: 'Pest Control',                          slug: 'pest_control',                icon: '🐛', group: 'home_property' },
  { name: 'Locksmith',                             slug: 'locksmith',                   icon: '🔑', group: 'home_property' },
  { name: 'Pressure Washing',                      slug: 'pressure_washing',            icon: '💦', group: 'home_property' },
  { name: 'Furniture Assembly',                    slug: 'furniture_assembly',          icon: '🛋️', group: 'home_property' },
  { name: 'Home Inspection',                       slug: 'home_inspection',             icon: '🔍', group: 'home_property' },
  { name: 'Landscaping & Gardening',               slug: 'landscaping',                 icon: '🌿', group: 'home_property' },
  { name: 'Pool Maintenance',                      slug: 'pool_maintenance',            icon: '🏊', group: 'home_property' },
  { name: 'Window Cleaning',                       slug: 'window_cleaning',             icon: '🪟', group: 'home_property' },

  // ── 2. Technology & Digital (19) ─────────────────────────────────────────
  { name: 'Web Development',                       slug: 'web_development',             icon: '🌐', group: 'technology_digital' },
  { name: 'Mobile App Development',                slug: 'mobile_app_development',      icon: '📱', group: 'technology_digital' },
  { name: 'Software Development',                  slug: 'software_development',        icon: '💾', group: 'technology_digital' },
  { name: 'UI/UX Design',                          slug: 'ui_ux_design',                icon: '🎨', group: 'technology_digital' },
  { name: 'Graphic Design',                        slug: 'graphic_design',              icon: '✏️', group: 'technology_digital' },
  { name: 'SEO & Digital Marketing',               slug: 'seo_digital_marketing',       icon: '📈', group: 'technology_digital' },
  { name: 'Social Media Management',               slug: 'social_media_management',     icon: '📲', group: 'technology_digital' },
  { name: 'Copywriting & Content Writing',         slug: 'copywriting',                 icon: '✍️', group: 'technology_digital' },
  { name: 'Video Editing & Animation',             slug: 'video_editing',               icon: '🎬', group: 'technology_digital' },
  { name: 'IT Support & Helpdesk',                 slug: 'it_support',                  icon: '🖥️', group: 'technology_digital' },
  { name: 'Cybersecurity Consulting',              slug: 'cybersecurity',               icon: '🔒', group: 'technology_digital' },
  { name: 'Cloud Setup (AWS, Azure, Google)',       slug: 'cloud_setup',                 icon: '☁️', group: 'technology_digital' },
  { name: 'Database Management',                   slug: 'database_management',         icon: '🗄️', group: 'technology_digital' },
  { name: 'CRM Setup & Customization',             slug: 'crm_setup',                   icon: '📊', group: 'technology_digital' },
  { name: 'E-Commerce Development',                slug: 'ecommerce_development',       icon: '🛒', group: 'technology_digital' },
  { name: 'WordPress Development',                 slug: 'wordpress_development',       icon: '📝', group: 'technology_digital' },
  { name: 'Data Entry & Web Research',             slug: 'data_entry',                  icon: '📋', group: 'technology_digital' },
  { name: 'AI & Automation Services',              slug: 'ai_automation',               icon: '🤖', group: 'technology_digital' },
  { name: 'Tech Repair (Computer, Phone, Tablet)', slug: 'tech_repair',                 icon: '🛠️', group: 'technology_digital' },

  // ── 3. Education & Coaching (14) ─────────────────────────────────────────
  { name: 'Academic Tutoring',                     slug: 'academic_tutoring',           icon: '📚', group: 'education_coaching' },
  { name: 'Test Preparation (SAT, GRE, IELTS…)',   slug: 'test_preparation',            icon: '📄', group: 'education_coaching' },
  { name: 'Language Lessons',                      slug: 'language_lessons',            icon: '🗣️', group: 'education_coaching' },
  { name: 'Music Lessons',                         slug: 'music_lessons',               icon: '🎵', group: 'education_coaching' },
  { name: 'Coding & Programming Tutoring',         slug: 'coding_tutoring',             icon: '💻', group: 'education_coaching' },
  { name: 'Art & Drawing Classes',                 slug: 'art_classes',                 icon: '🖼️', group: 'education_coaching' },
  { name: 'Exam Proctoring & Homework Help',       slug: 'homework_help',               icon: '📖', group: 'education_coaching' },
  { name: 'Life Coaching',                         slug: 'life_coaching',               icon: '🌟', group: 'education_coaching' },
  { name: 'Career Coaching & Resume Review',       slug: 'career_coaching',             icon: '💼', group: 'education_coaching' },
  { name: 'Business Coaching',                     slug: 'business_coaching',           icon: '💡', group: 'education_coaching' },
  { name: 'Executive Coaching',                    slug: 'executive_coaching',          icon: '👔', group: 'education_coaching' },
  { name: 'College Admissions Consulting',         slug: 'college_admissions',          icon: '🎓', group: 'education_coaching' },
  { name: 'Study Skills & Time Management',        slug: 'study_skills',                icon: '⏰', group: 'education_coaching' },
  { name: 'Online Course Creation Assistance',     slug: 'course_creation',             icon: '🎞️', group: 'education_coaching' },

  // ── 4. Health & Medical (13) ─────────────────────────────────────────────
  // Note: "COVID testing" replaced with "Mobile Health Screening" — broader & future-proof
  { name: 'General Medical Consultation',          slug: 'medical_consultation',        icon: '👨‍⚕️', group: 'health_medical' },
  { name: 'Nursing Care',                          slug: 'nursing_care',                icon: '🏥', group: 'health_medical' },
  { name: 'Physical Therapy',                      slug: 'physical_therapy',            icon: '🦴', group: 'health_medical' },
  { name: 'Occupational Therapy',                  slug: 'occupational_therapy',        icon: '🖐️', group: 'health_medical' },
  { name: 'Mental Health Counseling & Therapy',    slug: 'mental_health',               icon: '🧠', group: 'health_medical' },
  { name: 'Psychiatry Consultation',               slug: 'psychiatry',                  icon: '💭', group: 'health_medical' },
  { name: 'Nutrition & Dietetics',                 slug: 'nutrition',                   icon: '🥗', group: 'health_medical' },
  { name: 'Speech Therapy',                        slug: 'speech_therapy',              icon: '🗣️', group: 'health_medical' },
  { name: 'Home Health Aide',                      slug: 'home_health_aide',            icon: '🤲', group: 'health_medical' },
  { name: 'Medical Transport',                     slug: 'medical_transport',           icon: '🚑', group: 'health_medical' },
  { name: 'Mobile Health Screening',               slug: 'health_screening',            icon: '🩺', group: 'health_medical' },
  { name: 'Mobile Dental Hygiene',                 slug: 'mobile_dental',               icon: '🦷', group: 'health_medical' },
  { name: 'Chronic Disease Monitoring',            slug: 'chronic_disease_monitoring',  icon: '❤️', group: 'health_medical' },

  // ── 5. Beauty & Wellness (15) ────────────────────────────────────────────
  { name: 'Haircut & Styling',                     slug: 'haircut_styling',             icon: '✂️', group: 'beauty_wellness' },
  { name: 'Hair Coloring & Treatments',            slug: 'hair_coloring',               icon: '💇', group: 'beauty_wellness' },
  { name: 'Makeup Application',                    slug: 'makeup_application',          icon: '💄', group: 'beauty_wellness' },
  { name: 'Nail Care',                             slug: 'nail_care',                   icon: '💅', group: 'beauty_wellness' },
  { name: 'Facial Treatments & Skin Care',         slug: 'facial_skincare',             icon: '🧖', group: 'beauty_wellness' },
  { name: 'Massage Therapy',                       slug: 'massage_therapy',             icon: '💆', group: 'beauty_wellness' },
  { name: 'Waxing & Hair Removal',                 slug: 'waxing',                      icon: '✨', group: 'beauty_wellness' },
  { name: 'Eyelash Extensions & Brow Shaping',     slug: 'lash_brow',                   icon: '👁️', group: 'beauty_wellness' },
  { name: 'Tanning Services',                      slug: 'tanning',                     icon: '☀️', group: 'beauty_wellness' },
  { name: 'Spa Packages',                          slug: 'spa_packages',                icon: '🛁', group: 'beauty_wellness' },
  { name: 'Yoga Instruction',                      slug: 'yoga',                        icon: '🧘', group: 'beauty_wellness' },
  { name: 'Pilates Instruction',                   slug: 'pilates',                     icon: '🏋️', group: 'beauty_wellness' },
  { name: 'Personal Training (Fitness)',            slug: 'personal_training',           icon: '💪', group: 'beauty_wellness' },
  { name: 'Meditation & Mindfulness Coaching',     slug: 'meditation',                  icon: '🌸', group: 'beauty_wellness' },
  { name: 'Aromatherapy',                          slug: 'aromatherapy',                icon: '🌿', group: 'beauty_wellness' },

  // ── 6. Business & Professional (16) ──────────────────────────────────────
  { name: 'Accounting & Bookkeeping',              slug: 'accounting',                  icon: '💰', group: 'business_professional' },
  { name: 'Tax Preparation & Filing',              slug: 'tax_preparation',             icon: '📊', group: 'business_professional' },
  { name: 'Legal Consultation',                    slug: 'legal_consultation',          icon: '⚖️', group: 'business_professional' },
  { name: 'Business Plan Writing',                 slug: 'business_plan_writing',       icon: '📝', group: 'business_professional' },
  { name: 'Market Research',                       slug: 'market_research',             icon: '📈', group: 'business_professional' },
  { name: 'HR Consulting & Recruitment',           slug: 'hr_consulting',               icon: '👥', group: 'business_professional' },
  { name: 'Payroll Services',                      slug: 'payroll_services',            icon: '💳', group: 'business_professional' },
  { name: 'Virtual Assistant',                     slug: 'virtual_assistant',           icon: '🤝', group: 'business_professional' },
  { name: 'Administrative Support',                slug: 'administrative_support',      icon: '📁', group: 'business_professional' },
  { name: 'Transcription Services',                slug: 'transcription',               icon: '🎤', group: 'business_professional' },
  { name: 'Translation & Localization',            slug: 'translation',                 icon: '🌍', group: 'business_professional' },
  { name: 'Public Relations (PR)',                 slug: 'public_relations',            icon: '📢', group: 'business_professional' },
  { name: 'Brand Strategy',                        slug: 'brand_strategy',              icon: '🎯', group: 'business_professional' },
  { name: 'Lead Generation',                       slug: 'lead_generation',             icon: '🔎', group: 'business_professional' },
  { name: 'Sales Training',                        slug: 'sales_training',              icon: '🏆', group: 'business_professional' },
  { name: 'Notary Public',                         slug: 'notary_public',               icon: '📜', group: 'business_professional' },

  // ── 7. Events & Creative (15) ────────────────────────────────────────────
  { name: 'Photography',                           slug: 'photography',                 icon: '📷', group: 'events_creative' },
  { name: 'Videography & Video Production',        slug: 'videography',                 icon: '🎥', group: 'events_creative' },
  { name: 'Event Planning & Coordination',         slug: 'event_planning',              icon: '📋', group: 'events_creative' },
  { name: 'Wedding Planning',                      slug: 'wedding_planning',            icon: '💍', group: 'events_creative' },
  { name: 'Catering Services',                     slug: 'catering',                    icon: '🍽️', group: 'events_creative' },
  { name: 'Bartending Service',                    slug: 'bartending',                  icon: '🍸', group: 'events_creative' },
  { name: 'DJ & Live Music Booking',               slug: 'dj_music',                    icon: '🎧', group: 'events_creative' },
  { name: 'Florist & Floral Decoration',           slug: 'florist',                     icon: '💐', group: 'events_creative' },
  { name: 'Balloon & Party Decoration',            slug: 'party_decoration',            icon: '🎈', group: 'events_creative' },
  { name: 'Photo Booth Rental',                    slug: 'photo_booth',                 icon: '📸', group: 'events_creative' },
  { name: 'Invitation & Signage Design',           slug: 'invitation_design',           icon: '💌', group: 'events_creative' },
  { name: 'AV Equipment Rental & Setup',           slug: 'av_equipment',                icon: '🔊', group: 'events_creative' },
  { name: 'Stage & Lighting Design',               slug: 'stage_lighting',              icon: '💡', group: 'events_creative' },
  { name: 'Custom Cake Design',                    slug: 'custom_cake',                 icon: '🎂', group: 'events_creative' },
  { name: 'Officiant Services',                    slug: 'officiant',                   icon: '💒', group: 'events_creative' },

  // ── 8. Automotive & Transport (14) ───────────────────────────────────────
  { name: 'Car Detailing',                         slug: 'car_detailing',               icon: '✨', group: 'automotive_transport' },
  { name: 'Mobile Mechanic & Auto Repair',         slug: 'mobile_mechanic',             icon: '🔧', group: 'automotive_transport' },
  { name: 'Oil Change & Tire Rotation',            slug: 'oil_change',                  icon: '🛢️', group: 'automotive_transport' },
  { name: 'Tire Replacement & Alignment',          slug: 'tire_service',                icon: '🔄', group: 'automotive_transport' },
  { name: 'Car Washing',                           slug: 'car_washing',                 icon: '🚿', group: 'automotive_transport' },
  { name: 'Auto Body & Paint Repair',              slug: 'auto_body',                   icon: '🚗', group: 'automotive_transport' },
  { name: 'Towing & Roadside Assistance',          slug: 'towing',                      icon: '🚨', group: 'automotive_transport' },
  { name: 'Vehicle Shipping & Transport',          slug: 'vehicle_shipping',            icon: '🚢', group: 'automotive_transport' },
  { name: 'Car Rental Services',                   slug: 'car_rental',                  icon: '🚙', group: 'automotive_transport' },
  { name: 'Chauffeur & Limousine Service',         slug: 'chauffeur',                   icon: '🎩', group: 'automotive_transport' },
  { name: 'Delivery Services',                     slug: 'delivery_services',           icon: '📦', group: 'automotive_transport' },
  { name: 'Moving Services',                       slug: 'moving_services',             icon: '🚚', group: 'automotive_transport' },
  { name: 'Junk Removal',                          slug: 'junk_removal',                icon: '🗑️', group: 'automotive_transport' },
  { name: 'Motorcycle Repair & Detailing',         slug: 'motorcycle_repair',           icon: '🏍️', group: 'automotive_transport' },

  // ── 9. Lifestyle & Leisure (17) ──────────────────────────────────────────
  { name: 'Personal Shopping',                     slug: 'personal_shopping',           icon: '🛍️', group: 'lifestyle_leisure' },
  { name: 'Wardrobe Styling & Fashion Consulting', slug: 'wardrobe_styling',            icon: '👗', group: 'lifestyle_leisure' },
  { name: 'Interior Design Consultation',          slug: 'interior_design',             icon: '🏡', group: 'lifestyle_leisure' },
  { name: 'Home Staging',                          slug: 'home_staging',                icon: '🛋️', group: 'lifestyle_leisure' },
  { name: 'Laundry & Dry Cleaning Pickup/Delivery',slug: 'laundry',                     icon: '👕', group: 'lifestyle_leisure' },
  { name: 'Errand Running & Concierge',            slug: 'errand_concierge',            icon: '🏃', group: 'lifestyle_leisure' },
  { name: 'Pet Sitting & Dog Walking',             slug: 'pet_sitting',                 icon: '🐕', group: 'lifestyle_leisure' },
  { name: 'Pet Grooming',                          slug: 'pet_grooming',                icon: '🐾', group: 'lifestyle_leisure' },
  { name: 'Pet Training',                          slug: 'pet_training',                icon: '🦮', group: 'lifestyle_leisure' },
  { name: 'Travel Planning & Itinerary Design',    slug: 'travel_planning',             icon: '✈️', group: 'lifestyle_leisure' },
  { name: 'Tour Guiding',                          slug: 'tour_guiding',                icon: '🗺️', group: 'lifestyle_leisure' },
  { name: 'Cooking Classes',                       slug: 'cooking_classes',             icon: '🍳', group: 'lifestyle_leisure' },
  { name: 'Baking Classes',                        slug: 'baking_classes',              icon: '🍰', group: 'lifestyle_leisure' },
  { name: 'Wine Tasting Events',                   slug: 'wine_tasting',                icon: '🍷', group: 'lifestyle_leisure' },
  { name: 'Art & Craft Workshops',                 slug: 'art_craft_workshops',         icon: '🎨', group: 'lifestyle_leisure' },
  { name: 'Dance Lessons',                         slug: 'dance_lessons',               icon: '💃', group: 'lifestyle_leisure' },
  { name: 'Photography Walking Tours',             slug: 'photography_tours',           icon: '🚶', group: 'lifestyle_leisure' },

];

// ─── Groups summary for display ───────────────────────────────────────────────
const GROUP_LABELS = {
  home_property:          'Home & Property',
  technology_digital:     'Technology & Digital',
  education_coaching:     'Education & Coaching',
  health_medical:         'Health & Medical',
  beauty_wellness:        'Beauty & Wellness',
  business_professional:  'Business & Professional',
  events_creative:        'Events & Creative',
  automotive_transport:   'Automotive & Transport',
  lifestyle_leisure:      'Lifestyle & Leisure',
};

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  if (UPSERT_ONLY) {
    // ── Merge mode ───────────────────────────────────────────────────────
    console.log('🔀 Upsert mode — no categories will be deleted.\n');
    let created = 0, updated = 0;

    for (const cat of SEED_CATEGORIES) {
      const result = await Category.updateOne(
        { slug: cat.slug },
        { $set: { name: cat.name, icon: cat.icon, group: cat.group } },
        { upsert: true },
      );
      if (result.upsertedCount) created++;
      else if (result.modifiedCount) updated++;
    }

    console.log(`📂 Categories: ${created} created, ${updated} updated`);

  } else {
    // ── Replace mode ─────────────────────────────────────────────────────
    const workerCount = await WorkerProfile.countDocuments();
    if (workerCount > 0) {
      console.warn(`⚠️  ${workerCount} worker profile(s) exist — their category references may break.`);
      console.warn('   Re-run with --upsert to merge safely instead.\n');
    }

    const oldCount = await Category.countDocuments();
    await Category.deleteMany({});
    await Category.insertMany(SEED_CATEGORIES);

    console.log(`🗑️  Removed  : ${oldCount} old categories`);
    console.log(`📂 Inserted : ${SEED_CATEGORIES.length} categories across 9 groups\n`);

    // Per-group summary
    const byCounts = {};
    for (const c of SEED_CATEGORIES) byCounts[c.group] = (byCounts[c.group] || 0) + 1;
    Object.entries(byCounts).forEach(([g, n]) =>
      console.log(`   ${String(n).padStart(2)} — ${GROUP_LABELS[g] || g}`)
    );
  }

  // ── PlatformSettings ─────────────────────────────────────────────────────
  const s = await PlatformSettings.get();
  console.log(`\n⚙️  PlatformSettings: consultation ${s.consultationDefaultCommissionPercent}% | live class ${s.liveClassDefaultCommissionPercent}% | shop ${s.shopDefaultCommissionPercent}%`);

  console.log('\n🎉 Done — no user data touched.\n');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
