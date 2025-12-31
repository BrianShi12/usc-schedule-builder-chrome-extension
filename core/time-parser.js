/**
 * USC Schedule Builder - Time Parser
 * 
 * Parses time strings into comparable formats for conflict checking
 */

console.log('⏰ Time Parser module loaded');

/**
 * Parse a time string like "01:00pm-04:20pm" into start/end times
 * @param {string} timeStr - Time string (e.g., "01:00pm-04:20pm", "TBA")
 * @returns {Object} { start: number, end: number } in 24-hour decimal format (e.g., 13.0, 16.33)
 */
function parseTimeString(timeStr) {
    if (!timeStr || timeStr === 'TBA' || timeStr.trim() === '') {
        return null;
    }

    // Split on dash to get start and end times
    const parts = timeStr.split('-');
    if (parts.length !== 2) {
        console.warn('Invalid time format:', timeStr);
        return null;
    }

    const startTime = parseTime(parts[0].trim());
    const endTime = parseTime(parts[1].trim());

    if (startTime === null || endTime === null) {
        return null;
    }

    return { start: startTime, end: endTime };
}

/**
 * Parse a single time like "01:00pm" into 24-hour decimal
 * @param {string} time - Time string (e.g., "01:00pm")
 * @returns {number} Time in 24-hour decimal (e.g., 13.0)
 */
function parseTime(time) {
    const match = time.match(/(\d{1,2}):(\d{2})(am|pm)/i);
    if (!match) {
        console.warn('Cannot parse time:', time);
        return null;
    }

    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toLowerCase();

    // Convert to 24-hour format
    if (period === 'pm' && hours !== 12) {
        hours += 12;
    } else if (period === 'am' && hours === 12) {
        hours = 0;
    }

    // Return as decimal (e.g., 1:30 PM = 13.5)
    return hours + (minutes / 60);
}

/**
 * Parse days string into array of individual days
 * @param {string} daysStr - Days string (e.g., "TTh", "MWF", "M")
 * @returns {string[]} Array of days (e.g., ["T", "Th"])
 */
function parseDays(daysStr) {
    if (!daysStr || daysStr === 'TBA' || daysStr.trim() === '') {
        return [];
    }

    const days = [];
    let i = 0;

    while (i < daysStr.length) {
        // Check for two-letter days (Th)
        if (i < daysStr.length - 1 && daysStr.substring(i, i + 2) === 'Th') {
            days.push('Th');
            i += 2;
        } else {
            // Single letter day
            days.push(daysStr[i]);
            i += 1;
        }
    }

    return days;
}

/**
 * Check if two sections have overlapping days
 * @param {string[]} days1 - First section's days
 * @param {string[]} days2 - Second section's days
 * @returns {boolean} True if they share at least one day
 */
function daysOverlap(days1, days2) {
    return days1.some(day => days2.includes(day));
}

/**
 * Check if two time ranges overlap
 * @param {Object} time1 - { start, end }
 * @param {Object} time2 - { start, end }
 * @returns {boolean} True if times overlap
 */
function timesOverlap(time1, time2) {
    // Check if one starts before the other ends
    return time1.start < time2.end && time2.start < time1.end;
}

/**
 * Check if two sections have a time conflict
 * @param {Object} section1 - First section
 * @param {Object} section2 - Second section
 * @returns {boolean} True if they conflict
 */
function hasTimeConflict(section1, section2) {
    // Parse times
    const time1 = parseTimeString(section1.time);
    const time2 = parseTimeString(section2.time);

    // If either is TBA, no conflict
    if (!time1 || !time2) {
        return false;
    }

    // Parse days
    const days1 = parseDays(section1.days);
    const days2 = parseDays(section2.days);

    // If no shared days, no conflict
    if (!daysOverlap(days1, days2)) {
        return false;
    }

    // Check if times overlap
    return timesOverlap(time1, time2);
}

// Export functions
window.ScheduleBuilder = window.ScheduleBuilder || {};
window.ScheduleBuilder.parseTimeString = parseTimeString;
window.ScheduleBuilder.parseDays = parseDays;
window.ScheduleBuilder.hasTimeConflict = hasTimeConflict;
