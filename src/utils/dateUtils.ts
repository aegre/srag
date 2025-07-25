/**
 * Date utility functions for consistent timezone handling
 * All functions use UTC to avoid timezone conversion issues
 */

// Spanish day names
const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

// Spanish month names
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

/**
 * Parse a date string (YYYY-MM-DD) and return a UTC Date object
 * This avoids timezone conversion issues
 */
export function parseDateUTC(dateString: string): Date | null {
  if (!dateString) return null;

  try {
    const [year, month, day] = dateString.split('-').map(Number);

    // Validate date components
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      return null;
    }

    // Create date using UTC to avoid timezone shifts
    return new Date(Date.UTC(year, month - 1, day));
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return null;
  }
}

/**
 * Get day number from date string (e.g., "13" from "2025-09-13")
 */
export function getDayNumber(dateString: string): string {
  const date = parseDateUTC(dateString);
  if (!date) return '';

  return date.getUTCDate().toString();
}

/**
 * Get month name in Spanish from date string (e.g., "Septiembre" from "2025-09-13")
 */
export function getMonthName(dateString: string): string {
  const date = parseDateUTC(dateString);
  if (!date) return '';

  return MONTH_NAMES[date.getUTCMonth()];
}

/**
 * Get day of week in Spanish from date string (e.g., "Sábado" from "2025-09-13")
 */
export function getDayOfWeek(dateString: string): string {
  const date = parseDateUTC(dateString);
  if (!date) return '';

  return DAY_NAMES[date.getUTCDay()];
}

/**
 * Format date in Spanish format (e.g., "13 de Septiembre" from "2025-09-13")
 */
export function formatDateInSpanish(dateString: string): string {
  const dayNumber = getDayNumber(dateString);
  const monthName = getMonthName(dateString);

  if (!dayNumber || !monthName) return '';

  return `${dayNumber} de ${monthName}`;
}

/**
 * Format time string (HH:MM) to Spanish locale (e.g., "7:00 p.m." from "19:00")
 * Uses timezone-safe formatting to avoid conversion issues
 */
export function formatTime(timeString: string): string {
  if (!timeString) return '';

  try {
    const [hours, minutes] = timeString.split(':').map(Number);

    // Validate time components
    if (isNaN(hours) || isNaN(minutes)) {
      return timeString;
    }

    // Format time manually to avoid timezone conversion
    const period = hours >= 12 ? 'p.m.' : 'a.m.';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const displayMinutes = minutes.toString().padStart(2, '0');

    return `${displayHours}:${displayMinutes} ${period}`;
  } catch (error) {
    console.error('Error formatting time:', timeString, error);
    return timeString;
  }
}

/**
 * Get full date and time for countdown calculations
 * Uses local timezone for accurate countdown display
 */
export function getEventDateTime(dateString: string, timeString: string): string {
  if (!dateString || !timeString) return '';

  try {
    const [hours, minutes] = timeString.split(':').map(Number);

    // Create date in local timezone for countdown calculations
    const date = new Date(dateString);

    if (isNaN(date.getTime()) || isNaN(hours) || isNaN(minutes)) {
      return '';
    }

    // Set the time on the date in local timezone
    date.setHours(hours, minutes, 0, 0);

    return date.toISOString();
  } catch (error) {
    console.error('Error creating event datetime:', error);
    return '';
  }
} 