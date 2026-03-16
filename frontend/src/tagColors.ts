/** Stable colors for each tag, sampled from okLCH color space.
 *  L=0.75, C=0.12, H varies per tag — gives distinct pastel-ish colors
 *  that work well on dark backgrounds. */
const TAG_COLORS: Record<string, string> = {
  ai:              'oklch(0.75 0.12 280)',  // purple-blue
  crypto:          'oklch(0.75 0.12 160)',  // teal
  nanotech:        'oklch(0.75 0.12 130)',  // green
  cryonics:        'oklch(0.75 0.12 230)',  // light blue
  biology:         'oklch(0.75 0.12 145)',  // green-cyan
  space:           'oklch(0.75 0.12 260)',  // blue
  consciousness:   'oklch(0.75 0.12 310)',  // magenta
  economics:       'oklch(0.75 0.12 85)',   // yellow-green
  philosophy:      'oklch(0.75 0.12 340)',  // pink
  politics:        'oklch(0.75 0.12 25)',   // orange-red
  computing:       'oklch(0.75 0.12 200)',  // cyan-blue
  transhumanism:   'oklch(0.75 0.12 55)',   // orange
  physics:         'oklch(0.75 0.12 185)',  // cyan
}

export function tagColor(tag: string): string {
  return TAG_COLORS[tag] || 'oklch(0.75 0.05 0)'
}

export function tagBg(tag: string): string {
  const c = TAG_COLORS[tag]
  if (!c) return 'oklch(0.25 0.02 0)'
  // Same hue but darker and less saturated for background
  return c.replace('0.75', '0.25').replace('0.12', '0.06')
}
