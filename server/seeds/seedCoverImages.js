/**
 * seedCoverImages.js
 *
 * For every category:
 *   1. Searches Unsplash for a relevant photo (free API)
 *   2. Uploads it directly to your Cloudinary account
 *      (Cloudinary fetches from Unsplash — no local download needed)
 *   3. Saves the Cloudinary URL to Category.coverImage
 *
 * Requirements:
 *   - Free Unsplash API key  →  https://unsplash.com/developers
 *     (free tier = 50 req/hour — script waits 1.3 s between calls)
 *   - Cloudinary credentials already in your .env
 *
 * Usage:
 *   UNSPLASH_ACCESS_KEY=your_key node seeds/seedCoverImages.js
 *
 * Flags:
 *   --overwrite   Re-fetch & re-upload even if category already has an image
 *   --dry-run     Print what would be uploaded, don't save anything
 */

import mongoose from 'mongoose';
import cloudinaryPkg from 'cloudinary';
import * as dotenv from 'dotenv';
dotenv.config();

import Category from '../models/Category.js';

const { v2: cloudinary } = cloudinaryPkg;
const UNSPLASH_KEY = process.env.UNSPLASH_ACCESS_KEY;
const OVERWRITE    = process.argv.includes('--overwrite');
const DRY_RUN      = process.argv.includes('--dry-run');

// ── Validate env ──────────────────────────────────────────────────────────────
if (!UNSPLASH_KEY) {
  console.error('❌  UNSPLASH_ACCESS_KEY is not set.');
  console.error('    Get a free key → https://unsplash.com/developers');
  process.exit(1);
}
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('❌  Cloudinary env vars missing (CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET).');
  process.exit(1);
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Curated search terms per category slug ────────────────────────────────────
const SEARCH = {
  // Home & Property
  plumbing:               'plumber pipe repair water',
  electrical_work:        'electrician wiring installation',
  carpentry:              'carpentry woodworking joinery timber',
  painting_decorating:    'painter decorating wall house brush',
  handyman:               'handyman home repair tools belt',
  hvac:                   'air conditioning hvac technician unit',
  roofing:                'roofing roof tiles construction worker',
  flooring:               'flooring tiles installation hardwood',
  appliance_repair:       'appliance repair technician kitchen fix',
  cleaning_services:      'professional house cleaning mop bucket',
  pest_control:           'pest control exterminator spray insect',
  locksmith:              'locksmith door lock key security',
  pressure_washing:       'pressure washing driveway power clean',
  furniture_assembly:     'furniture assembly tools screwdriver',
  home_inspection:        'home inspection house checklist building',
  landscaping:            'landscaping garden lawn mowing green',
  pool_maintenance:       'swimming pool maintenance clean water',
  window_cleaning:        'window cleaning squeegee glass building',

  // Technology & Digital
  web_development:        'web development coding laptop screen',
  mobile_app_development: 'mobile app development smartphone screen',
  software_development:   'software development programming code',
  ui_ux_design:           'ui ux design wireframe interface prototype',
  graphic_design:         'graphic design creative studio tablet',
  seo_digital_marketing:  'seo digital marketing analytics dashboard',
  social_media_management:'social media marketing content phone',
  copywriting:            'copywriting writing desk laptop coffee',
  video_editing:          'video editing computer editing software',
  it_support:             'it support helpdesk computer technician',
  cybersecurity:          'cybersecurity network security lock digital',
  cloud_setup:            'cloud computing server data center rack',
  database_management:    'database server data management storage',
  crm_setup:              'crm software business dashboard metrics',
  ecommerce_development:  'ecommerce online shopping website cart',
  wordpress_development:  'wordpress website blog design cms',
  data_entry:             'data entry typing keyboard office work',
  ai_automation:          'artificial intelligence automation technology',
  tech_repair:            'phone laptop computer repair technician',

  // Education & Coaching
  academic_tutoring:      'tutoring student study books classroom',
  test_preparation:       'exam preparation student study desk books',
  language_lessons:       'language learning class teaching speaking',
  music_lessons:          'music lesson piano guitar teacher student',
  coding_tutoring:        'coding programming teaching kids computer',
  art_classes:            'art class painting drawing lesson studio',
  homework_help:          'homework help child studying books parent',
  life_coaching:          'life coaching consultation conversation office',
  career_coaching:        'career coaching professional advice meeting',
  business_coaching:      'business coaching mentor meeting whiteboard',
  executive_coaching:     'executive coaching leadership boardroom',
  college_admissions:     'college university campus admission student',
  study_skills:           'study skills student planner organized desk',
  course_creation:        'online course creation teaching recording',

  // Health & Medical
  medical_consultation:   'doctor medical consultation office stethoscope',
  nursing_care:           'nurse nursing care hospital patient',
  physical_therapy:       'physical therapy rehabilitation exercise patient',
  occupational_therapy:   'occupational therapy patient care hands',
  mental_health:          'mental health therapy counselling session calm',
  psychiatry:             'psychiatry mental health doctor consultation',
  nutrition:              'nutrition dietitian healthy food vegetables',
  speech_therapy:         'speech therapy language child communication',
  home_health_aide:       'home health aide elderly care caregiver',
  medical_transport:      'medical transport patient care ambulance',
  health_screening:       'health screening medical checkup clinic',
  mobile_dental:          'dentist dental care teeth clinic',
  chronic_disease_monitoring: 'health monitoring patient care medical',

  // Beauty & Wellness
  haircut_styling:        'haircut hair salon styling barber',
  hair_coloring:          'hair coloring salon highlights treatment',
  makeup_application:     'makeup artist beauty cosmetics brush',
  nail_care:              'nail care manicure pedicure salon',
  facial_skincare:        'facial skincare beauty spa treatment',
  massage_therapy:        'massage therapy spa relaxation table',
  waxing:                 'beauty salon waxing treatment aesthetic',
  lash_brow:              'eyelash brow beauty makeup studio',
  tanning:                'tanning spray tan beauty studio',
  spa_packages:           'spa luxury treatment relaxation pool',
  yoga:                   'yoga class studio mat pose',
  pilates:                'pilates class exercise reformer studio',
  personal_training:      'personal trainer gym fitness workout weights',
  meditation:             'meditation mindfulness calm zen nature',
  aromatherapy:           'aromatherapy essential oils spa candle',

  // Business & Professional
  accounting:             'accounting finance documents calculator office',
  tax_preparation:        'tax preparation accountant office paperwork',
  legal_consultation:     'lawyer legal consultation office books',
  business_plan_writing:  'business plan writing strategy office',
  market_research:        'market research analysis data charts',
  hr_consulting:          'hr consulting human resources team office',
  payroll_services:       'payroll services accounting business office',
  virtual_assistant:      'virtual assistant remote work laptop home',
  administrative_support: 'administrative office support desk receptionist',
  transcription:          'transcription typing headphones audio desk',
  translation:            'translation language interpreter global',
  public_relations:       'public relations media press conference',
  brand_strategy:         'brand strategy marketing creative team',
  lead_generation:        'lead generation sales marketing funnel',
  sales_training:         'sales training presentation business team',
  notary_public:          'notary public document signing official',

  // Events & Creative
  photography:            'photographer camera portrait studio session',
  videography:            'videographer camera filming wedding event',
  event_planning:         'event planning decoration venue coordinator',
  wedding_planning:       'wedding planning decoration flowers elegant',
  catering:               'catering food buffet event table spread',
  bartending:             'bartender cocktail bar drinks making',
  dj_music:               'dj music turntable party event crowd',
  florist:                'florist flowers arrangement bouquet shop',
  party_decoration:       'party decoration balloons celebration colorful',
  photo_booth:            'photo booth fun party props smiling',
  invitation_design:      'invitation design wedding stationery print',
  av_equipment:           'av sound system event stage equipment',
  stage_lighting:         'stage lighting event concert colourful',
  custom_cake:            'custom cake baking decoration celebration',
  officiant:              'wedding ceremony outdoor couple officiant',

  // Automotive & Transport
  car_detailing:          'car detailing cleaning polish shine',
  mobile_mechanic:        'mechanic car repair engine hood',
  oil_change:             'oil change car service mechanic garage',
  tire_service:           'tire service wheel car garage fitting',
  car_washing:            'car wash cleaning foam vehicle',
  auto_body:              'auto body repair paint car workshop',
  towing:                 'towing truck service breakdown road',
  vehicle_shipping:       'vehicle shipping transport truck carrier',
  car_rental:             'car rental vehicle keys dealership',
  chauffeur:              'chauffeur driver luxury car professional',
  delivery_services:      'delivery service package courier scooter',
  moving_services:        'moving service boxes truck relocation',
  junk_removal:           'junk removal truck waste disposal',
  motorcycle_repair:      'motorcycle repair bike mechanic workshop',

  // Lifestyle & Leisure
  personal_shopping:      'personal shopping fashion stylist store',
  wardrobe_styling:       'wardrobe styling fashion clothes rack',
  interior_design:        'interior design home decor modern room',
  home_staging:           'home staging real estate interior living',
  laundry:                'laundry washing machine clothes folding',
  errand_concierge:       'concierge service assistant helping',
  pet_sitting:            'pet sitting dog cat care playing',
  pet_grooming:           'pet grooming dog bath salon clean',
  pet_training:           'dog training obedience pet park',
  travel_planning:        'travel planning vacation destination map',
  tour_guiding:           'tour guide sightseeing travel group',
  cooking_classes:        'cooking class chef kitchen food teaching',
  baking_classes:         'baking class bread pastry kitchen flour',
  wine_tasting:           'wine tasting glass vineyard elegant',
  art_craft_workshops:    'art craft workshop creative hands making',
  dance_lessons:          'dance lesson class studio performing',
  photography_tours:      'photography tour landscape scenic camera',
};

// ── Unsplash: search for photo URL ────────────────────────────────────────────
async function searchUnsplash(query) {
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1&orientation=landscape&content_filter=high`;
  const res  = await fetch(url, { headers: { Authorization: `Client-ID ${UNSPLASH_KEY}` } });

  if (res.status === 403 || res.status === 429) throw new Error('RATE_LIMIT');
  if (!res.ok) throw new Error(`Unsplash HTTP ${res.status}`);

  const data  = await res.json();
  const photo = data.results?.[0];
  if (!photo) return null;

  // Get a decent sized raw URL — Cloudinary will re-process it
  return `${photo.urls.raw}&w=1200&q=85&auto=format&fit=crop&crop=center`;
}

// ── Cloudinary: upload from URL ───────────────────────────────────────────────
async function uploadToCloudinary(imageUrl, slug) {
  const result = await cloudinary.uploader.upload(imageUrl, {
    folder:         `${process.env.CLOUDINARY_FOLDER || 'skillhub'}/categories`,
    public_id:      slug,
    overwrite:      true,
    resource_type:  'image',
    transformation: [
      { width: 600, height: 450, crop: 'fill', gravity: 'auto' },
      { quality: 'auto:good', fetch_format: 'auto' },
    ],
  });
  return result.secure_url;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅  MongoDB connected');
  console.log(`☁️   Cloudinary: ${process.env.CLOUDINARY_CLOUD_NAME}`);
  console.log(DRY_RUN ? '🔍  DRY RUN — nothing will be saved\n' : '\n');

  const categories = await Category.find({ isActive: true }).lean();
  console.log(`📦  ${categories.length} active categories found\n`);

  let updated = 0, skipped = 0, failed = 0;

  for (const cat of categories) {
    if (cat.coverImage && !OVERWRITE) {
      console.log(`⏭️   ${cat.slug.padEnd(35)} already has image`);
      skipped++;
      continue;
    }

    const query = SEARCH[cat.slug] || cat.name;
    process.stdout.write(`🔍  ${cat.slug.padEnd(35)} `);

    try {
      // 1. Find photo on Unsplash
      const unsplashUrl = await searchUnsplash(query);
      if (!unsplashUrl) {
        console.log('— no result from Unsplash');
        failed++;
        continue;
      }

      // 2. Upload to Cloudinary
      if (DRY_RUN) {
        console.log(`(dry-run) → would upload from Unsplash`);
        updated++;
      } else {
        const cloudinaryUrl = await uploadToCloudinary(unsplashUrl, cat.slug);
        await Category.updateOne({ _id: cat._id }, { coverImage: cloudinaryUrl });
        console.log(`✓  ${cloudinaryUrl.slice(0, 55)}…`);
        updated++;
      }

      // Respect Unsplash 50 req/hour limit (1 per 1.2 s minimum)
      await new Promise((r) => setTimeout(r, 1400));

    } catch (err) {
      if (err.message === 'RATE_LIMIT') {
        console.log('\n⏳  Unsplash rate limit hit — wait an hour then run again.');
        break;
      }
      console.log(`❌  ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${'─'.repeat(45)}`);
  console.log(`✅  Uploaded to Cloudinary : ${updated}`);
  console.log(`⏭️   Skipped (had image)    : ${skipped}`);
  console.log(`❌  Failed                 : ${failed}`);
  console.log(`${'─'.repeat(45)}`);

  await mongoose.disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
