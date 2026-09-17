// Group display order: demand-first (urgent / high-frequency → high-value → specialist → lifestyle)
// Lucide SVG icons are used for visual UI (GROUP_META in Landing / Browse).
// No emoji — optgroup labels use the label text only.
export const CATEGORY_GROUPS = [
  { slug: 'home_property',         label: 'Home & Property'         }, // 1 — urgent, highest volume
  { slug: 'beauty_wellness',       label: 'Beauty & Wellness'       }, // 2 — high-frequency, repeat bookings
  { slug: 'events_creative',       label: 'Events & Creative'       }, // 3 — high value (weddings, events)
  { slug: 'technology_digital',    label: 'Technology & Digital'    }, // 4 — growing demand
  { slug: 'education_coaching',    label: 'Education & Coaching'    }, // 5 — always in demand
  { slug: 'automotive_transport',  label: 'Automotive & Transport'  }, // 6 — situational but common
  { slug: 'health_medical',        label: 'Health & Medical'        }, // 7 — specialist
  { slug: 'business_professional', label: 'Business & Professional' }, // 8 — B2B / niche
  { slug: 'lifestyle_leisure',     label: 'Lifestyle & Leisure'     }, // 9 — aspirational / nice-to-have
];
