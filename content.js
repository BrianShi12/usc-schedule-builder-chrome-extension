/**
 * USC Schedule Builder - Content Script
 * 
 * This script runs on the WebReg CourseBin page and:
 * 1. Injects a "Generate Potential Schedules" button
 * 2. Extracts course data from the DOM
 * 3. (Future) Runs the conflict-check algorithm
 */

console.log('🚀 USC Schedule Builder extension loaded!');

/**
 * Main initialization function
 */
function initializeExtension() {
  // Only run on the CourseBin page
  if (!isCourseBinPage()) {
    console.log('Not on CourseBin page, exiting...');
    return;
  }

  console.log('✅ Detected CourseBin page');

  // Inject the "Generate Potential Schedules" button
  injectScheduleButton();
}

/**
 * Check if we're on the CourseBin page
 */
function isCourseBinPage() {
  return window.location.pathname.includes('/CourseBin');
}

/**
 * Inject the "Generate Potential Schedules" button next to Expand/Collapse buttons
 */
function injectScheduleButton() {
  // Find the container with Expand All / Collapse All buttons
  const expandAllButton = document.querySelector('#expandAll');

  if (!expandAllButton) {
    console.error('Could not find #expandAll button - page structure may have changed');
    return;
  }

  // Get the parent container
  const buttonContainer = expandAllButton.parentElement;

  // Check if button already exists (prevent duplicates)
  if (document.querySelector('#generateSchedulesBtn')) {
    console.log('Button already exists');
    return;
  }

  // Create our custom button
  const scheduleButton = document.createElement('a');
  scheduleButton.id = 'generateSchedulesBtn';
  scheduleButton.href = '#';
  scheduleButton.className = 'btn btn-primary schedule-generator-btn';
  scheduleButton.textContent = '📅 Generate Potential Schedules';

  // Add click event listener
  scheduleButton.addEventListener('click', handleGenerateSchedules);

  // Insert the button into the page (after the Collapse All button)
  buttonContainer.appendChild(scheduleButton);

  console.log('✅ Injected "Generate Potential Schedules" button');
}

/**
 * Handle click on "Generate Potential Schedules" button
 */
function handleGenerateSchedules(event) {
  event.preventDefault();

  console.log('🎯 Generate Schedules button clicked!');

  // Extract course data from the DOM
  const courseData = extractCourseData();

  // Log the extracted data for now
  console.log('📚 Extracted course data:', courseData);
  console.log(`Found ${courseData.length} courses with a total of ${getTotalSections(courseData)} sections`);

  // TODO: Run conflict-check algorithm
  // TODO: Display results in calendar overlay

  alert(`Found ${courseData.length} courses in your CourseBin!\n\nCheck the console (F12) to see the extracted data.\n\n(Conflict-check algorithm coming in Phase 2!)`);
}

/**
 * Extract all course data from the CourseBin DOM
 */
function extractCourseData() {
  const courses = [];

  // Find all course headers
  const courseHeaders = document.querySelectorAll('.course-header');

  courseHeaders.forEach(header => {
    // Extract course code and title from the header
    const courseId = header.querySelector('.crsID')?.textContent.replace(':', '').trim();
    const courseTitle = header.querySelector('.crsTitl')?.textContent.trim();

    if (!courseId) {
      console.warn('Could not find course ID in header:', header);
      return;
    }

    // Find the associated content area with sections
    const contentAreaId = header.getAttribute('href');
    const contentArea = contentAreaId ? document.querySelector(contentAreaId) : null;

    if (!contentArea) {
      console.warn('Could not find content area for course:', courseId);
      return;
    }

    // Extract all sections for this course
    const sections = extractSectionsFromContentArea(contentArea);

    courses.push({
      courseCode: courseId,
      courseTitle: courseTitle || '',
      sections: sections
    });
  });

  return courses;
}

/**
 * Extract all sections from a course's content area
 */
function extractSectionsFromContentArea(contentArea) {
  const sections = [];

  // Find all section elements (each has id="section_XXXXX")
  const sectionElements = contentArea.querySelectorAll('.section');

  sectionElements.forEach(sectionElement => {
    const sectionData = extractSectionData(sectionElement);
    if (sectionData) {
      sections.push(sectionData);
    }
  });

  return sections;
}

/**
 * Extract data from a single section element
 */
function extractSectionData(sectionElement) {
  // Get section ID from the element's id attribute
  const sectionId = sectionElement.id.replace('section_', '');

  if (!sectionId) {
    console.warn('Section element has no ID:', sectionElement);
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
    isScheduled: false,
    isRegistered: false
  };

  // Find all section_row elements (these contain the data fields)
  const rows = sectionElement.querySelectorAll('.section_row');

  rows.forEach(row => {
    // Each row has a hidden label (.table-headers-xsmall) and a value
    const label = row.querySelector('.table-headers-xsmall')?.textContent.replace(':', '').trim();

    // Get the value by finding the span that's NOT the label
    const valueSpans = row.querySelectorAll('span:not(.table-headers-xsmall)');
    const value = Array.from(valueSpans)
      .map(span => span.textContent.trim())
      .filter(text => text.length > 0)
      .join(' ');

    // Fallback: if no value found, try splitting by label text
    const fallbackValue = value || row.textContent.split(':')[1]?.trim() || '';

    // Map the label to the appropriate field
    if (label === 'Section') {
      data.sectionFull = fallbackValue;
    } else if (label === 'Type') {
      data.type = fallbackValue;
    } else if (label === 'Time') {
      data.time = fallbackValue;
    } else if (label === 'Days') {
      data.days = fallbackValue;
    } else if (label === 'Instructor') {
      data.instructor = fallbackValue;
    } else if (label === 'Location') {
      data.location = fallbackValue;
    } else if (label === 'Units') {
      data.units = fallbackValue;
    }
  });

  // Check if section is registered or scheduled
  const statusText = sectionElement.textContent.toLowerCase();
  data.isRegistered = statusText.includes('this section is registered');
  data.isScheduled = statusText.includes('scheduled');

  return data;
}

/**
 * Get total number of sections across all courses
 */
function getTotalSections(courses) {
  return courses.reduce((total, course) => total + course.sections.length, 0);
}

// Initialize the extension when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  // DOM is already ready
  initializeExtension();
}
