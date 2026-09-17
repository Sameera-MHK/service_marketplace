import {
  Aperture, Atom, AudioLines, Battery, Bell, Bike, BookA, BookMarked,
  BookOpen, BookText, Brain, Bug, Building2, Calculator, CalendarCheck,
  Camera, Car, Cake, ChefHat, CircleDot, ClipboardList, Code2, Cpu,
  Disc, Disc2, Dna, DoorOpen, Droplets, FileSpreadsheet, FileText,
  Flame, FlaskConical, Flower, Flower2, Gauge, Gem, Globe, Guitar,
  GraduationCap, Hammer, HardHat, Headphones, Heart, HeartHandshake,
  Home, Image, Landmark, Laptop, Layers, Leaf, LayoutGrid, Mail,
  MessageCircle, Mic, Mic2, Monitor, Music, Music2, Music3, Music4,
  Navigation, Paintbrush, PaintBucket, Palette, Pen, PenTool,
  PersonStanding, Receipt, Scissors, Shield, Shirt, Sparkle, Sparkles,
  SprayCan, Sun, Target, TestTube, Theater, Trash2, TrendingUp,
  Trophy, Umbrella, UtensilsCrossed, Video, Waves, Wind, Wrench, Zap,
  ArrowUpToLine,
} from 'lucide-react';

import { SLUG_TO_ICON } from '../lib/categoryIcons';

const ICON_COMPONENTS = {
  Aperture, Atom, AudioLines, Battery, Bell, Bike, BookA, BookMarked,
  BookOpen, BookText, Brain, Bug, Building2, Calculator, CalendarCheck,
  Camera, Car, Cake, ChefHat, CircleDot, ClipboardList, Code2, Cpu,
  Disc, Disc2, Dna, DoorOpen, Droplets, FileSpreadsheet, FileText,
  Flame, FlaskConical, Flower, Flower2, Gauge, Gem, Globe, Guitar,
  GraduationCap, Hammer, HardHat, Headphones, Heart, HeartHandshake,
  Home, Image, Landmark, Laptop, Layers, Leaf, LayoutGrid, Mail,
  MessageCircle, Mic, Mic2, Monitor, Music, Music2, Music3, Music4,
  Navigation, Paintbrush, PaintBucket, Palette, Pen, PenTool,
  PersonStanding, Receipt, Scissors, Shield, Shirt, Sparkle, Sparkles,
  SprayCan, Sun, Target, TestTube, Theater, Trash2, TrendingUp,
  Trophy, Umbrella, UtensilsCrossed, Video, Waves, Wind, Wrench, Zap,
  ArrowUpToLine,
};

/**
 * Renders a Lucide icon for a category.
 *
 * Usage (by slug — recommended):
 *   <CategoryIcon slug="math_tutor" size={24} className="text-violet-600" />
 *
 * Usage (by icon name stored in DB):
 *   <CategoryIcon icon={cat.icon} size={24} />
 */
export default function CategoryIcon({ slug, icon, size = 20, className = '' }) {
  // Resolve icon name: prefer slug lookup, fallback to direct icon name from DB
  const iconName = (slug && SLUG_TO_ICON[slug]) || icon || 'Wrench';
  const Icon = ICON_COMPONENTS[iconName] || Wrench;
  return <Icon size={size} className={className} strokeWidth={1.75} />;
}
