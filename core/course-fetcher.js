/**
 * USC Schedule Builder - Course Fetcher
 * 
 * Fetches all sections for given course codes by scraping WebReg department pages
 */

// DEBUG declaration removed - inherits from time-parser.js
debugLog('📚 Course Fetcher module loaded');

/**
 * Main function to fetch all sections for an array of course codes
 * @param {string[]} courseCodes - Array of course codes (e.g., ["CSCI-350", "MATH-225"])
 * @param {string} termId - Term ID (e.g., "20261" for Spring 2026)
 * @returns {Promise<Object[]>} Array of course objects with all their sections
 */
async function fetchCoursesData(courseCodes, termId) {
    debugLog('🔍 Fetching courses:', courseCodes);

    const results = [];

    for (const courseCode of courseCodes) {
        try {
            const courseData = await fetchSingleCourse(courseCode, termId);
            results.push(courseData);
        } catch (error) {
            console.error(`Error fetching ${courseCode}:`, error);
            results.push({
                courseCode: courseCode,
                error: error.message,
                sections: []
            });
        }
    }

    return results;
}

/**
 * Fetch all sections for a single course
 * @param {string} courseCode - Course code (e.g., "CSCI-350")
 * @param {string} termId - Term ID
 * @returns {Promise<Object>} Course object with all sections
 */
async function fetchSingleCourse(courseCode, termId) {
    const [dept, number] = courseCode.split('-');
    if (!dept || !number) {
        throw new Error(`Invalid course code format: ${courseCode}. Expected format: DEPT-NUMBER (e.g., CSCI-350)`);
    }
    debugLog(`📖 Fetching ${courseCode} from ${dept} department`);
    // PAGINATION FIX: Search multiple pages
    const MAX_PAGES = 10;
    for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
        const departmentUrl = pageNum === 1
            ? `/Courses?Program=${dept}`
            : `/Courses?pageNumber=${pageNum}&Program=${dept}`;
        debugLog(`  📄 Checking page ${pageNum}...`);
        try {
            const html = await fetchDepartmentPage(departmentUrl);
            const courseData = parseCourseFromHTML(html, courseCode);
            debugLog(`  ✓ Found ${courseCode} on page ${pageNum}`);
            return courseData;
        } catch (parseError) {
            // Course not on this page, try next
            if (pageNum === MAX_PAGES) {
                throw new Error(`Course ${courseCode} not found after checking ${MAX_PAGES} pages`);
            }
        }
    }
}

/**
 * Fetch a department page's HTML
 * @param {string} url - Department URL
 * @returns {Promise<string>} HTML content
 */
async function fetchDepartmentPage(url) {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        return html;

    } catch (error) {
        console.error('Error fetching department page:', error);
        throw new Error(`Could not load department page: ${error.message}`);
    }
}

/**
 * Parse HTML to extract course and section data
 * @param {string} html - Department page HTML
 * @param {string} courseCode - Course code to find
 * @returns {Object} Course data with sections
 */
function parseCourseFromHTML(html, courseCode) {
    // Create a temporary DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    // Find course headers (same structure as CourseBin)
    const courseHeaders = doc.querySelectorAll('.course-header');

    debugLog(`Found ${courseHeaders.length} courses in ${courseCode.split('-')[0]} department`);

    let targetCourse = null;
    let contentArea = null;

    // Debug: Log all course codes found
    const foundCourses = [];
    for (const header of courseHeaders) {
        const courseId = header.querySelector('.crsID')?.textContent.replace(':', '').trim();
        foundCourses.push(courseId);
    }
    debugLog('Available courses:', foundCourses);

    // Search for our specific course
    for (const header of courseHeaders) {
        const courseId = header.querySelector('.crsID')?.textContent.replace(':', '').trim();

        // Match if courseId starts with our search code (handles suffixes like 'g', 'x')
        if (courseId && courseId.startsWith(courseCode)) {
            targetCourse = header;

            // Find associated content area
            const contentAreaId = header.getAttribute('href');
            if (contentAreaId) {
                contentArea = doc.querySelector(contentAreaId);
            }
            break;
        }
    }

    if (!targetCourse) {
        console.error(`❌ Course ${courseCode} not found. Available courses:`, foundCourses);
        throw new Error(`Course ${courseCode} not found in department listing`);
    }

    const courseTitle = targetCourse.querySelector('.crsTitl')?.textContent.trim() || '';

    // Extract sections from content area
    const sections = extractSectionsFromContentArea(contentArea);

    return {
        courseCode: courseCode,
        courseTitle: courseTitle,
        sections: sections
    };
}

/**
 * Extract sections from a course content area (reused from content.js)
 * @param {HTMLElement} contentArea - Content area element
 * @returns {Array} Array of section objects
 */
function extractSectionsFromContentArea(contentArea) {
    if (!contentArea) {
        return [];
    }

    const sections = [];
    const sectionElements = contentArea.querySelectorAll('.section');

    sectionElements.forEach(sectionElement => {
        const sectionData = extractSectionData(sectionElement);
        if (sectionData) {
            sections.push(sectionData);
        }
    });

    // Log section availability stats
    const openCount = sections.filter(s => s.isOpen).length;
    const closedCount = sections.length - openCount;
    debugLog(`  📊 Extracted ${sections.length} sections: ${openCount} open, ${closedCount} closed`);

    return sections;
}

/**
 * Extract data from a single section element
 * @param {HTMLElement} sectionElement - Section element
 * @returns {Object} Section data
 */
function extractSectionData(sectionElement) {
    const sectionId = sectionElement.id.replace('section_', '');

    if (!sectionId) {
        return null;
    }

    const data = {
        sectionId: sectionId,
        type: '',
        time: '',
        days: '',
        instructor: '',
        location: '',
        units: '',
        registered: 0,
        seats: 0,
        isOpen: false  // Default to closed; will be set to true if seats available
    };

    const rows = sectionElement.querySelectorAll('.section_row');

    rows.forEach(row => {
        const label = row.querySelector('.table-headers-xsmall')?.textContent.replace(':', '').trim();
        const valueSpans = row.querySelectorAll('span:not(.table-headers-xsmall)');
        const value = Array.from(valueSpans)
            .map(span => span.textContent.trim())
            .filter(text => text.length > 0)
            .join(' ');

        const fallbackValue = value || row.textContent.split(':')[1]?.trim() || '';

        // Map label to field
        switch (label) {
            case 'Section':
                data.sectionFull = fallbackValue;
                break;
            case 'Type':
                data.type = fallbackValue;
                break;
            case 'Time':
                data.time = fallbackValue;
                break;
            case 'Days':
                data.days = fallbackValue;
                break;
            case 'Instructor':
                data.instructor = fallbackValue;
                break;
            case 'Location':
                data.location = fallbackValue;
                break;
            case 'Units':
                data.units = fallbackValue;
                break;
            case 'Registered':
                // Check if section is explicitly closed
                if (fallbackValue.toLowerCase().includes('closed')) {
                    data.isOpen = false;
                    data.registered = 0;
                    data.seats = 0;
                } else {
                    // Parse "45 of 50" format
                    const regMatch = fallbackValue.match(/(\d+)\s*of\s*(\d+)/);
                    if (regMatch) {
                        data.registered = parseInt(regMatch[1]);
                        data.seats = parseInt(regMatch[2]);
                        data.isOpen = data.registered < data.seats;
                    } else {
                        // If we can't parse the format, assume it's closed to be safe
                        data.isOpen = false;
                    }
                }
                break;
        }
    });

    return data;
}

/**
 * Get current term ID from the page
 * @returns {string} Term ID (e.g., "20261")
 */
function getCurrentTermId() {
    // Try to find term from the active term tab
    const termTab = document.querySelector('#activeTermTab');
    if (termTab) {
        const termText = termTab.textContent.trim();
        // Parse term code from text if possible
        // Format might be "Spring 2026" - we'd need to convert to "20261"
        // For now, return a placeholder
        return '20261'; // TODO: Parse from page
    }

    // Fallback: try to extract from URL or other page elements
    const urlMatch = window.location.search.match(/term=(\d+)/);
    if (urlMatch) {
        return urlMatch[1];
    }

    return '20261'; // Default fallback
}

// Export functions for use in tab-injector.js
window.ScheduleBuilder = window.ScheduleBuilder || {};
window.ScheduleBuilder.fetchCoursesData = fetchCoursesData;
window.ScheduleBuilder.getCurrentTermId = getCurrentTermId;
