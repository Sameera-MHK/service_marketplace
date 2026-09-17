/**
 * migrateCategorySlugs.js
 *
 * One-time migration: remap old seed.js category slugs → new seedCategories.js slugs
 * on every WorkerProfile doc. Run after seedCategories.js to fix workerCount = 0
 * on the Browse / Services page.
 *
 * Safe to run multiple times (skips workers already on a valid new slug).
 *
 * Usage:
 *   node seeds/migrateCategorySlugs.js            ← live update
 *   node seeds/migrateCategorySlugs.js --dry-run  ← preview only
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import WorkerProfile from '../models/WorkerProfile.js';
import Category     from '../models/Category.js';

const DRY = process.argv.includes('--dry-run');

// ── Mapping: old slug → new slug ──────────────────────────────────────────────
// Old slugs come from the original seed.js SEED_CATEGORIES array.
// New slugs come from seedCategories.js (141 categories, 9 groups).
const SLUG_MAP = {
  // Home & Construction → Home & Property
  electrician:               'electrical_work',
  plumber:                   'plumbing',
  solar_panel:               'handyman',
  aluminium_fabrication:     'handyman',
  ac_technician:             'hvac',
  cctv_security:             'locksmith',
  masonry_tiling:            'flooring',
  waterproofing_roofing:     'roofing',
  painter:                   'painting_decorating',
  carpenter:                 'carpentry',
  mason:                     'flooring',
  tiler:                     'flooring',

  // Tech & Creative → Technology & Digital
  web_developer:             'web_development',
  ui_ux_designer:            'ui_ux_design',
  social_media_seo:          'seo_digital_marketing',
  video_editor:              'video_editing',
  graphic_designer:          'graphic_design',
  it_tech:                   'tech_repair',

  // Education & Training → Education & Coaching
  ielts_english:             'language_lessons',
  coding_stem:               'coding_tutoring',
  professional_exam_tuition: 'test_preparation',
  school_tuition:            'academic_tutoring',
  tutor:                     'academic_tutoring',

  // Events & Entertainment → Events & Creative
  event_photography:         'photography',
  photographer:              'photography',
  sound_lighting_av:         'av_equipment',
  event_planner:             'event_planning',
  stage_decor_floral:        'florist',
  dj_entertainment:          'dj_music',
  caterer:                   'catering',

  // Beauty & Wellness (unchanged group name, some slug changes)
  bridal_makeup:             'makeup_application',
  makeup_artist:             'makeup_application',
  home_salon:                'haircut_styling',
  ayurveda_massage:          'massage_therapy',
  nail_art:                  'nail_care',
  fitness_yoga:              'yoga',

  // Household → Home & Property
  home_cleaning:             'cleaning_services',
  cleaner:                   'cleaning_services',
  gardening:                 'landscaping',
  gardener:                  'landscaping',
  maid_babysitting:          'errand_concierge',
  sofa_sanitization:         'cleaning_services',

  // Healthcare → Health & Medical
  elderly_care:              'home_health_aide',
  physiotherapy:             'physical_therapy',
  home_lab:                  'health_screening',
  postnatal_care:            'nursing_care',
  medical_equipment:         'medical_transport',
  home_nurse:                'nursing_care',

  // Automotive → Automotive & Transport
  ev_battery_repair:         'mobile_mechanic',
  vehicle_inspection:        'mobile_mechanic',
  mechanic:                  'mobile_mechanic',

  // Professional Services → Business & Professional
  tax_bookkeeping:           'accounting',
  business_registration:     'legal_consultation',
  legal_notary:              'legal_consultation',

  // Transport & Delivery → Automotive & Transport
  house_shifting:            'moving_services',
  courier_delivery:          'delivery_services',
  ecommerce_delivery:        'delivery_services',
  vehicle_towing:            'towing',
  driver:                    'chauffeur',

  // Tourism & Travel → Lifestyle & Leisure
  airport_chauffeur:         'chauffeur',
  tour_guide:                'tour_guiding',
  cook:                      'cooking_classes',

  // Art, Crafts & Lifestyle → Lifestyle & Leisure
  tailoring_fashion:         'wardrobe_styling',
  commissioned_art:          'art_craft_workshops',
};

async function run() {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) throw new Error('Set MONGO_URI in .env');
  await mongoose.connect(uri);
  console.log('✅  MongoDB connected');

  // Load all valid (new) category slugs
  const validSlugs = new Set(
    (await Category.find({}, 'slug').lean()).map((c) => c.slug)
  );
  console.log(`📂  ${validSlugs.size} valid category slugs loaded\n`);

  // Fetch all workers
  const workers = await WorkerProfile.find({}, '_id category').lean();
  console.log(`👷  ${workers.length} worker profiles found\n`);

  let migrated = 0, skipped = 0, unknown = 0;

  for (const w of workers) {
    const old = w.category;

    // Already on a valid slug → skip
    if (validSlugs.has(old)) {
      skipped++;
      continue;
    }

    const newSlug = SLUG_MAP[old];
    if (!newSlug) {
      console.warn(`⚠️   Worker ${w._id} — unknown slug "${old}" (no mapping)`);
      unknown++;
      continue;
    }

    if (DRY) {
      console.log(`🔍  (dry) ${old.padEnd(30)} → ${newSlug}`);
    } else {
      await WorkerProfile.updateOne({ _id: w._id }, { $set: { category: newSlug } });
      console.log(`✓   ${old.padEnd(30)} → ${newSlug}`);
    }
    migrated++;
  }

  console.log(`\n${'─'.repeat(45)}`);
  console.log(`✅  Migrated  : ${migrated}`);
  console.log(`⏭️   Skipped   : ${skipped}  (already valid)`);
  console.log(`⚠️   Unknown   : ${unknown}  (no mapping found)`);
  console.log(`${'─'.repeat(45)}`);
  if (DRY) console.log('\n🔍  DRY RUN — nothing was saved.\n');

  await mongoose.disconnect();
}

run().catch((e) => { console.error(e); process.exit(1); });
