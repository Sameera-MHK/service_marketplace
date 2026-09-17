/**
 * seedGroups.js — Seed the 9 platform service groups
 *
 * Safe to run any time — upserts by slug, never deletes.
 * Run this before seedCategories.js.
 *
 * Usage:
 *   node seeds/seedGroups.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import Group from '../models/Group.js';

// Order reflects demand-first logic: urgent/high-frequency → high-value → specialist → nice-to-have
const GROUPS = [
  {
    order: 1,
    slug:  'home_property',
    icon:  '🏠',
    name:  'Home & Property',
    tagline:     'Keep your home running perfectly',
    description: 'Trusted professionals for every repair, installation, and maintenance job around your home and property.',
  },
  {
    order: 2,
    slug:  'beauty_wellness',
    icon:  '💆',
    name:  'Beauty & Wellness',
    tagline:     'Look and feel your best',
    description: 'Book makeup artists, salon professionals, massage therapists, yoga instructors, and fitness trainers.',
  },
  {
    order: 3,
    slug:  'events_creative',
    icon:  '🎉',
    name:  'Events & Creative',
    tagline:     'Make every occasion unforgettable',
    description: 'Photographers, event planners, DJs, florists, caterers, and creative professionals for every special moment.',
  },
  {
    order: 4,
    slug:  'technology_digital',
    icon:  '💻',
    name:  'Technology & Digital',
    tagline:     'Build, grow, and fix anything digital',
    description: 'From web development and app design to IT support, SEO, and AI automation — find the right tech talent.',
  },
  {
    order: 5,
    slug:  'education_coaching',
    icon:  '📚',
    name:  'Education & Coaching',
    tagline:     'Learn anything, from anyone',
    description: 'Academic tutors, language coaches, career advisors, and skill trainers — all in one place.',
  },
  {
    order: 6,
    slug:  'automotive_transport',
    icon:  '🚗',
    name:  'Automotive & Transport',
    tagline:     'Keep moving, safely',
    description: 'Mobile mechanics, car detailers, movers, chauffeurs, delivery riders, and vehicle specialists on demand.',
  },
  {
    order: 7,
    slug:  'health_medical',
    icon:  '🏥',
    name:  'Health & Medical',
    tagline:     'Professional care, at your doorstep',
    description: 'Qualified nurses, therapists, and healthcare workers who come to you — for recovery, routine care, and specialist support.',
  },
  {
    order: 8,
    slug:  'business_professional',
    icon:  '💼',
    name:  'Business & Professional',
    tagline:     'Expert support for your business',
    description: 'Accountants, legal advisors, HR consultants, virtual assistants, and business strategists ready to help.',
  },
  {
    order: 9,
    slug:  'lifestyle_leisure',
    icon:  '✨',
    name:  'Lifestyle & Leisure',
    tagline:     'Elevate your everyday life',
    description: 'Personal shoppers, interior designers, pet groomers, travel planners, cooking instructors, and more.',
  },
];

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  let created = 0;
  let updated = 0;

  for (const g of GROUPS) {
    const result = await Group.updateOne(
      { slug: g.slug },
      { $set: g },
      { upsert: true },
    );
    if (result.upsertedCount) created++;
    else if (result.modifiedCount) updated++;
  }

  console.log(`🗂️  Groups: ${created} created, ${updated} updated\n`);
  console.log('Groups seeded:');
  GROUPS.forEach((g) => console.log(`  ${g.icon}  [${g.order}] ${g.name} (${g.slug})`));
  console.log('\n🎉 Done.\n');

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
