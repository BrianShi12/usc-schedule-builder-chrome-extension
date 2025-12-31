/**
 * USC Schedule Builder - Calendar Renderer (v0-inspired table layout)
 * 
 * Renders schedule data into a visual weekly calendar grid using HTML table
 */

const DEBUG = false;
debugLog = DEBUG ? console.log.bind(console) : () => { };

debugLog('📅 Calendar Renderer module loaded (v0 table layout)');

// Initialize namespace
if (!window.ScheduleBuilder) {
    window.ScheduleBuilder = {};
}

/**
 * Render a schedule as a weekly calendar table
 * @param {Array} schedule - Array of section objects
 * @param {HTMLElement} container - Container element to render into
 * @returns {HTMLElement} The calendar table
 */
window.ScheduleBuilder.renderCalendar = function (schedule, container) {
    debugLog(`🗓️ Rendering calendar for schedule with ${schedule.length} sections`);

    // Clear container
    container.innerHTML = '';

    // Time slots: 8am to 8pm
    const timeSlots = [
        '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
        '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
        '6:00 PM', '7:00 PM', '8:00 PM'
    ];

    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const dayAbbrev = ['M', 'T', 'W', 'Th', 'F'];

    // Create table
    const table = document.createElement('table');
    table.className = 'calendar-table';

    // Create header row
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    // Time column header
    const timeHeader = document.createElement('th');
    timeHeader.className = 'time-header';
    timeHeader.textContent = 'Time';
    headerRow.appendChild(timeHeader);

    // Day headers
    days.forEach((day) => {
        const th = document.createElement('th');
        th.textContent = day;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body with time rows
    const tbody = document.createElement('tbody');

    timeSlots.forEach((time, index) => {
        const row = document.createElement('tr');
        row.dataset.hour = index + 8; // 8am = index 0

        // Time cell
        const timeCell = document.createElement('td');
        timeCell.className = 'time-cell';
        timeCell.textContent = time;
        row.appendChild(timeCell);

        // Day cells
        dayAbbrev.forEach((dayCode) => {
            const cell = document.createElement('td');
            cell.dataset.day = dayCode;
            cell.dataset.hour = index + 8;
            row.appendChild(cell);
        });

        tbody.appendChild(row);
    });

    table.appendChild(tbody);

    // Assign colors and place courses
    const courseColors = assignCourseColors(schedule);

    schedule.forEach(section => {
        placeSectionOnCalendar(section, tbody, courseColors);
    });

    container.appendChild(table);
    return table;
};

/**
 * Assign colors to courses
 */
function assignCourseColors(schedule) {
    // Use single USC-friendly green (matching v0 design)
    const color = '#70ad47';

    const courseColors = {};
    const uniqueCourses = [...new Set(schedule.map(s => s.courseCode || 'Unknown'))];

    uniqueCourses.forEach((course) => {
        courseColors[course] = color;
    });

    return courseColors;
}

/**
 * Place a section on the calendar table
 */
function placeSectionOnCalendar(section, tbody, courseColors) {
    // Parse days
    const sectionDays = parseDays(section.days);

    if (sectionDays.length === 0) {
        console.warn(`Section ${section.sectionId} has no valid days: "${section.days}"`);
        return;
    }

    // Parse time
    const timeInfo = parseTimeRange(section.time);

    if (!timeInfo) {
        console.warn(`Section ${section.sectionId} has invalid time: "${section.time}"`);
        return;
    }

    const { startHour, startMin, endHour, endMin } = timeInfo;

    // Find the row for the start hour
    const startRow = tbody.querySelector(`tr[data-hour="${startHour}"]`);

    if (!startRow) {
        console.warn(`No row found for hour ${startHour}`);
        return;
    }

    // Create course block for each day
    sectionDays.forEach(dayCode => {
        const cell = startRow.querySelector(`td[data-day="${dayCode}"]`);

        if (!cell) {
            console.warn(`No cell found for day ${dayCode}`);
            return;
        }

        // Calculate duration
        const startTimeInHours = startHour + startMin / 60;
        const endTimeInHours = endHour + endMin / 60;
        const durationInHours = endTimeInHours - startTimeInHours;

        // Create course block
        const block = document.createElement('div');
        block.className = 'course-block';
        block.style.backgroundColor = courseColors[section.courseCode] || '#70ad47';
        block.style.height = `${durationInHours * 40 - 4}px`; // 40px per hour row minus margin

        // Block content - Format: COURSE-CODE (sectionId) on line 1, time on line 2
        // SECURITY: Use textContent instead of innerHTML to prevent XSS
        const courseLabel = `${section.courseCode || 'Unknown'} (${section.sectionId})`;
        const startTime = section.time ? section.time.split('-')[0] : '';

        // Create text node for course label (safe from XSS)
        const labelText = document.createTextNode(courseLabel);
        block.appendChild(labelText);

        // Add line break
        block.appendChild(document.createElement('br'));

        // Add time span
        const timeSpan = document.createElement('span');
        timeSpan.className = 'course-block-time';
        timeSpan.textContent = startTime;
        block.appendChild(timeSpan);

        // Tooltip
        block.title = `${section.courseCode} - ${section.type}\n${section.time} on ${section.days}\nSection ${section.sectionId}\n${section.instructor} @ ${section.location}`;

        // Ensure cell is positioned
        if (cell.style.position !== 'relative') {
            cell.style.position = 'relative';
        }

        cell.appendChild(block);
    });
}

/**
 * Parse days string into day codes
 */
function parseDays(daysStr) {
    if (!daysStr || daysStr === 'TBA') return [];

    const days = [];
    let i = 0;

    while (i < daysStr.length) {
        // Check for "Th" first
        if (daysStr.substring(i, i + 2) === 'Th') {
            days.push('Th');
            i += 2;
        } else if (['M', 'T', 'W', 'F'].includes(daysStr[i])) {
            days.push(daysStr[i]);
            i += 1;
        } else {
            i += 1;
        }
    }

    return days;
}

/**
 * Parse time range "9:00am-9:50am" into {startHour, startMin, endHour, endMin}
 */
function parseTimeRange(timeStr) {
    if (!timeStr || timeStr === 'TBA') return null;

    // Match pattern like "9:00am-9:50am" or "2:00pm-3:15pm"
    const match = timeStr.match(/(\d{1,2}):(\d{2})(am|pm)-(\d{1,2}):(\d{2})(am|pm)/);

    if (!match) return null;

    let startHour = parseInt(match[1]);
    const startMin = parseInt(match[2]);
    const startPeriod = match[3];

    let endHour = parseInt(match[4]);
    const endMin = parseInt(match[5]);
    const endPeriod = match[6];

    // Convert to 24-hour
    if (startPeriod === 'pm' && startHour !== 12) startHour += 12;
    if (startPeriod === 'am' && startHour === 12) startHour = 0;
    if (endPeriod === 'pm' && endHour !== 12) endHour += 12;
    if (endPeriod === 'am' && endHour === 12) endHour = 0;

    return { startHour, startMin, endHour, endMin };
}
