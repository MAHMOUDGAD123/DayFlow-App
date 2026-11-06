// Hidden curated palette of distinct colors for tasks
// Excludes fixed yellow (#FACC15) which is reserved strictly for Sleeping
export const AUTOMATED_TASK_PALETTE: string[] = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Purple
  '#F97316', // Orange
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#D946EF', // Fuchsia
  '#84CC16', // Lime
  '#0EA5E9', // Sky
  '#A855F7', // Violet
  '#F43F5E', // Rose
  '#22C55E', // Green
  '#64748B', // Slate
  '#2DD4BF', // Turquoise
  '#E11D48', // Ruby
  '#4F46E5', // Deep Indigo
  '#38BDF8', // Light Blue
  '#34D399', // Mint
];

// Fixed yellow color strictly reserved for Sleeping schedule
export const SLEEP_COLOR = '#FACC15';

/**
 * Automatically picks an unused color from the palette for a new task.
 * If all colors in the palette are in use, cycles through based on existing tasks count.
 */
export function getNextAutomatedTaskColor(existingTasks: { color: string }[]): string {
  const usedColors = new Set(existingTasks.map((t) => t.color.toUpperCase()));
  for (const c of AUTOMATED_TASK_PALETTE) {
    if (!usedColors.has(c.toUpperCase())) {
      return c;
    }
  }
  return AUTOMATED_TASK_PALETTE[existingTasks.length % AUTOMATED_TASK_PALETTE.length];
}
