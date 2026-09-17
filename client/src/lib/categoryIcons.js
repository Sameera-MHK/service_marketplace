/**
 * Maps category slug → Lucide icon name.
 * Used by CategoryIcon component and the admin icon picker.
 */

export const SLUG_TO_ICON = {
  // ── Core trades ────────────────────────────────────────────────────
  electrician:             'Zap',
  plumber:                 'Droplets',
  mason:                   'HardHat',
  painter:                 'Paintbrush',
  ac_technician:           'Wind',
  tiler:                   'LayoutGrid',
  it_tech:                 'Monitor',
  cleaner:                 'Sparkles',
  domestic_helper:         'Home',

  // ── Home Repair ────────────────────────────────────────────────────
  carpenter:               'Hammer',
  welder:                  'Flame',
  roof_repair:             'Building2',
  ceiling_fixer:           'ArrowUpToLine',
  floor_polisher:          'Layers',
  window_door_fitter:      'DoorOpen',
  wall_plastering:         'PaintBucket',
  waterproofing:           'Umbrella',

  // ── Tech & Electrical ──────────────────────────────────────────────
  cctv_installer:          'Camera',
  solar_technician:        'Sun',
  generator_technician:    'Cpu',
  water_pump_technician:   'Gauge',
  inverter_installer:      'Battery',
  intercom_gate_installer: 'Bell',

  // ── Household ──────────────────────────────────────────────────────
  gardener:                'Leaf',
  pest_control:            'Bug',
  pool_maintenance:        'Waves',
  laundry_ironing:         'Shirt',
  deep_cleaning:           'SprayCan',
  septic_tank_cleaning:    'Trash2',

  // ── Care & Education ───────────────────────────────────────────────
  caregiver:               'Heart',
  elder_care:              'HeartHandshake',
  babysitter:              'Sparkle',
  tutor:                   'BookOpen',
  event_helper:            'CalendarCheck',
  cook_chef:               'ChefHat',

  // ── Transport & Vehicles ───────────────────────────────────────────
  vehicle_mechanic:        'Wrench',
  three_wheeler_mechanic:  'Bike',
  driver_chauffeur:        'Car',
  tyre_repair:             'CircleDot',

  // ── Weddings & Events ──────────────────────────────────────────────
  wedding_planner:         'Gem',
  photographer:            'Aperture',
  videographer:            'Video',
  photo_editor:            'Image',
  dj_sound:                'Headphones',
  emcee:                   'Mic',
  floral_decorator:        'Flower2',
  stage_designer:          'Theater',
  makeup_artist:           'Palette',
  bridal_hairstylist:      'Scissors',
  catering:                'UtensilsCrossed',
  cake_maker:              'Cake',
  invitation_designer:     'Mail',

  // ── Subject tutors ────────────────────────────────────────────────
  math_tutor:              'Calculator',
  science_tutor:           'TestTube',
  physics_tutor:           'Atom',
  chemistry_tutor:         'FlaskConical',
  biology_tutor:           'Dna',
  english_tutor:           'BookText',
  history_tutor:           'Landmark',
  ict_tutor:               'Laptop',
  commerce_tutor:          'TrendingUp',
  accounting_tutor:        'Receipt',

  // ── Specialised Academic ───────────────────────────────────────────
  university_lecturer:     'GraduationCap',
  thesis_research_guide:   'FileText',
  english_speaking_coach:  'MessageCircle',
  ielts_toefl_trainer:     'Globe',
  sat_gre_trainer:         'ClipboardList',

  // ── Creative & Performing Arts ─────────────────────────────────────
  piano_teacher:           'Music',
  guitar_teacher:          'Guitar',
  violin_teacher:          'AudioLines',
  drums_teacher:           'Disc2',
  classical_dance_teacher: 'Flower',
  western_dance_coach:     'PersonStanding',
  vocal_coach:             'Mic2',
  art_teacher:             'PenTool',

  // ── Sports Coaching ────────────────────────────────────────────────
  cricket_coach:           'Trophy',
  swimming_coach:          'Waves',
  badminton_coach:         'Target',
  martial_arts_instructor: 'Shield',
  football_coach:          'Disc',
  chess_coach:             'Brain',

  // ── Tech & Professional Training ───────────────────────────────────
  coding_tutor:            'Code2',
  graphic_design_tutor:    'Pen',
  ms_office_trainer:       'FileSpreadsheet',
  driving_instructor:      'Navigation',
};

/**
 * All unique Lucide icon names available in the admin picker.
 * Sorted alphabetically for easy browsing.
 */
export const PICKER_ICONS = [
  'Aperture','Atom','AudioLines','Battery','Bell','Bike','BookA','BookMarked',
  'BookOpen','BookText','Brain','Bug','Building2','Calculator','CalendarCheck',
  'Camera','Car','Cake','ChefHat','CircleDot','ClipboardList','Code2','Cpu',
  'Disc','Disc2','Dna','DoorOpen','Droplets','FileSpreadsheet','FileText',
  'Flame','FlaskConical','Flower','Flower2','Gauge','Gem','Globe','Guitar',
  'GraduationCap','Hammer','HardHat','Headphones','Heart','HeartHandshake',
  'Home','Image','Landmark','Laptop','Layers','Leaf','LayoutGrid','Mail',
  'MessageCircle','Mic','Mic2','Monitor','Music','Music2','Music3','Music4',
  'Navigation','Paintbrush','PaintBucket','Palette','Pen','PenTool',
  'PersonStanding','Receipt','Scissors','Shield','Shirt','Sparkle','Sparkles',
  'SprayCan','Sun','Target','TestTube','Theater','Trash2','TrendingUp',
  'Trophy','Umbrella','UtensilsCrossed','Video','Waves','Wind','Wrench','Zap',
  'ArrowUpToLine',
];
