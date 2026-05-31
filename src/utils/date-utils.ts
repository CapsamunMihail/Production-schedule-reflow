import { DateTime } from "luxon";
import type { MaintenanceWindow, WorkCenterShift } from "../reflow/types";

const UTC_ZONE = "utc";

export function parseUtcDate(date: string): DateTime {
  const parsed = DateTime.fromISO(date, { zone: UTC_ZONE });

  if (!parsed.isValid) {
    throw new Error(`Invalid ISO date: ${date}`);
  }

  return parsed;
}

export function toIsoUtc(date: DateTime): string {
  return date.toUTC().toISO({ suppressMilliseconds: true }) ?? date.toUTC().toISO()!;
}

/**
 * The test data uses JavaScript-style day numbers:
 * 0 = Sunday, 1 = Monday, ..., 6 = Saturday.
 *
 * Luxon uses:
 * 1 = Monday, ..., 7 = Sunday.
 */
export function getScheduleDayOfWeek(date: DateTime): number {
  return date.weekday % 7;
}

export function getShiftStart(date: DateTime, shift: WorkCenterShift): DateTime {
  return date.set({
    hour: shift.startHour,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
}

export function getShiftEnd(date: DateTime, shift: WorkCenterShift): DateTime {
  return date.set({
    hour: shift.endHour,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
}

export function isWithinShift(date: DateTime, shifts: WorkCenterShift[]): boolean {
  const dayOfWeek = getScheduleDayOfWeek(date);

  return shifts.some((shift) => {
    if (shift.dayOfWeek !== dayOfWeek) {
      return false;
    }

    const shiftStart = getShiftStart(date, shift);
    const shiftEnd = getShiftEnd(date, shift);

    return date >= shiftStart && date < shiftEnd;
  });
}

export function findCurrentShift(
  date: DateTime,
  shifts: WorkCenterShift[]
): WorkCenterShift | null {
  const dayOfWeek = getScheduleDayOfWeek(date);

  return (
    shifts.find((shift) => {
      if (shift.dayOfWeek !== dayOfWeek) {
        return false;
      }

      const shiftStart = getShiftStart(date, shift);
      const shiftEnd = getShiftEnd(date, shift);

      return date >= shiftStart && date < shiftEnd;
    }) ?? null
  );
}

export function isInsideMaintenanceWindow(
  date: DateTime,
  maintenanceWindows: MaintenanceWindow[]
): MaintenanceWindow | null {
  return (
    maintenanceWindows.find((window) => {
      const start = parseUtcDate(window.startDate);
      const end = parseUtcDate(window.endDate);

      return date >= start && date < end;
    }) ?? null
  );
}

export function findNextMaintenanceStartBefore(
  date: DateTime,
  limit: DateTime,
  maintenanceWindows: MaintenanceWindow[]
): DateTime | null {
  const candidates = maintenanceWindows
    .map((window) => parseUtcDate(window.startDate))
    .filter((maintenanceStart) => maintenanceStart > date && maintenanceStart < limit)
    .sort((a, b) => a.toMillis() - b.toMillis());

  return candidates[0] ?? null;
}

/**
 * Moves the date forward until it reaches a time where work is allowed:
 * - inside a valid shift
 * - outside maintenance windows
 */
export function moveToNextAvailableTime(
  startDate: DateTime,
  shifts: WorkCenterShift[],
  maintenanceWindows: MaintenanceWindow[]
): DateTime {
  if (shifts.length === 0) {
    throw new Error("Work center has no shifts configured.");
  }

  let cursor = startDate.toUTC();

  /**
   * Safety guard to avoid infinite loops if the schedule configuration is impossible.
   * 366 days is more than enough for this technical test.
   */
  for (let guard = 0; guard < 366 * 24 * 60; guard++) {
    const maintenanceWindow = isInsideMaintenanceWindow(cursor, maintenanceWindows);

    if (maintenanceWindow) {
      cursor = parseUtcDate(maintenanceWindow.endDate);
      continue;
    }

    if (isWithinShift(cursor, shifts)) {
      return cursor;
    }

    const nextShiftStart = findNextShiftStart(cursor, shifts);
    cursor = nextShiftStart;
  }

  throw new Error("Could not find next available working time.");
}

export function findNextShiftStart(
  date: DateTime,
  shifts: WorkCenterShift[]
): DateTime {
  const cursor = date.toUTC();

  const candidates: DateTime[] = [];

  /**
   * Search up to 14 days ahead.
   * This is enough for weekly recurring shift schedules.
   */
  for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
    const candidateDay = cursor.plus({ days: dayOffset });
    const dayOfWeek = getScheduleDayOfWeek(candidateDay);

    const shiftsForDay = shifts.filter((shift) => shift.dayOfWeek === dayOfWeek);

    for (const shift of shiftsForDay) {
      const shiftStart = getShiftStart(candidateDay, shift);

      if (shiftStart >= cursor) {
        candidates.push(shiftStart);
      }
    }
  }

  candidates.sort((a, b) => a.toMillis() - b.toMillis());

  const nextShiftStart = candidates[0];

  if (!nextShiftStart) {
    throw new Error("Could not find next shift start.");
  }

  return nextShiftStart;
}

/**
 * Calculates the real end date of a work order.
 *
 * The function counts only working minutes:
 * - work can happen only during configured shifts
 * - work pauses outside shifts
 * - work pauses during maintenance windows
 */
export function calculateEndDateWithAvailability(params: {
  startDate: string;
  durationMinutes: number;
  shifts: WorkCenterShift[];
  maintenanceWindows: MaintenanceWindow[];
}): string {
  const { startDate, durationMinutes, shifts, maintenanceWindows } = params;

  if (durationMinutes < 0) {
    throw new Error("Duration cannot be negative.");
  }

  if (durationMinutes === 0) {
    return toIsoUtc(parseUtcDate(startDate));
  }

  let remainingMinutes = durationMinutes;
  let cursor = moveToNextAvailableTime(
    parseUtcDate(startDate),
    shifts,
    maintenanceWindows
  );

  for (let guard = 0; guard < 366 * 24 * 60; guard++) {
    if (remainingMinutes <= 0) {
      return toIsoUtc(cursor);
    }

    cursor = moveToNextAvailableTime(cursor, shifts, maintenanceWindows);

    const currentShift = findCurrentShift(cursor, shifts);

    if (!currentShift) {
      cursor = findNextShiftStart(cursor, shifts);
      continue;
    }

    const shiftEnd = getShiftEnd(cursor, currentShift);

    const nextMaintenanceStart = findNextMaintenanceStartBefore(
      cursor,
      shiftEnd,
      maintenanceWindows
    );

    const availableUntil = nextMaintenanceStart ?? shiftEnd;

    const availableMinutes = Math.floor(
      availableUntil.diff(cursor, "minutes").minutes
    );

    if (availableMinutes <= 0) {
      cursor = availableUntil;
      continue;
    }

    const workedMinutes = Math.min(remainingMinutes, availableMinutes);

    cursor = cursor.plus({ minutes: workedMinutes });
    remainingMinutes -= workedMinutes;
  }

  throw new Error("Could not calculate end date within safety limit.");
}

export function diffInMinutes(startDate: string, endDate: string): number {
  const start = parseUtcDate(startDate);
  const end = parseUtcDate(endDate);

  return Math.round(end.diff(start, "minutes").minutes);
}