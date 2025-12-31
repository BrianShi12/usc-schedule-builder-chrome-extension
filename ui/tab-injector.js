/**
 * USC Schedule Builder - Tab Injector
 * 
 * Injects a new "Schedule Builder" tab into WebReg's navigation bar
 * next to myCourseBin and myCalendar tabs
 */

console.log('🔧 Schedule Builder Tab Injector loaded');

/**
 * Main initialization function for tab injection
 */
function injectScheduleBuilderTab() {
  // Only run on WebReg pages
  if (!window.location.hostname.includes('webreg.usc.edu')) {
    console.log('Not on WebReg, skipping tab injection');
    return;
  }

  // CRITICAL: Don't inject on login page
  // Login URL: https://webreg.usc.edu/Login?ReturnUrl=%2FTerms
  if (window.location.pathname.includes('/Login')) {
    console.log('On login page - skipping injection');
    return;
  }

  console.log('✅ On authenticated WebReg page - attempting to inject Schedule Builder tab');

  // Find the navigation bar
  const navBar = document.querySelector('ul.nav.navbar-nav');

  if (!navBar) {
    console.error('❌ Could not find navigation bar (ul.nav.navbar-nav)');
    return;
  }

  // Find the myCalendar tab as our injection point
  const myCalendarLink = document.getElementById('mItMyCal');

  if (!myCalendarLink) {
    console.error('❌ Could not find myCalendar tab');
    return;
  }

  const myCalendarLi = myCalendarLink.parentElement;

  // Check if Schedule Builder tab already exists (prevent duplicates)
  if (document.getElementById('mItSchBld')) {
    console.log('Schedule Builder tab already exists');
    return;
  }

  // Create the new tab list item
  const scheduleBuilderLi = document.createElement('li');
  scheduleBuilderLi.id = 'schBldTab';

  // Create the link element
  const scheduleBuilderLink = document.createElement('a');
  scheduleBuilderLink.id = 'mItSchBld';
  scheduleBuilderLink.href = '#';
  scheduleBuilderLink.textContent = 'myScheduleBuilder';

  // Style as inactive by default (white text, no background)
  scheduleBuilderLink.style.color = 'rgb(255, 255, 255)';
  scheduleBuilderLink.style.backgroundColor = 'transparent';
  scheduleBuilderLink.style.padding = '15px';
  scheduleBuilderLink.style.display = 'block';
  scheduleBuilderLink.style.textDecoration = 'none';

  // Add hover effect
  scheduleBuilderLink.addEventListener('mouseenter', () => {
    if (!scheduleBuilderLi.classList.contains('active')) {
      scheduleBuilderLink.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    }
  });

  scheduleBuilderLink.addEventListener('mouseleave', () => {
    if (!scheduleBuilderLi.classList.contains('active')) {
      scheduleBuilderLink.style.backgroundColor = 'transparent';
    }
  });

  // Add click event listener
  scheduleBuilderLink.addEventListener('click', (e) => {
    e.preventDefault();
    activateScheduleBuilderTab();
  });

  // Append link to list item
  scheduleBuilderLi.appendChild(scheduleBuilderLink);

  // Inject after myCalendar tab
  navBar.insertBefore(scheduleBuilderLi, myCalendarLi.nextSibling);

  // Add event listeners to OTHER tabs to hide Schedule Builder when they're clicked
  setupTabCleanupListeners();

  console.log('✅ Schedule Builder tab injected successfully!');
}

/**
 * Setup listeners on other tabs to hide Schedule Builder content when they're clicked
 */
function setupTabCleanupListeners() {
  // Use > selector to only get direct children (top-level tabs), not dropdown items
  const allTabs = document.querySelectorAll('ul.nav.navbar-nav > li > a');

  allTabs.forEach(tab => {
    // Skip our Schedule Builder tab
    if (tab.id === 'mItSchBld') return;

    // Skip dropdown toggles (they don't navigate, just open menus)
    if (tab.classList.contains('dropdown-toggle')) return;

    // Add click listener to hide Schedule Builder and show WebReg content
    tab.addEventListener('click', () => {
      const scheduleBuilderContainer = document.getElementById('schedule-builder-container');
      const sbSite = document.querySelector('#sb-site');

      if (scheduleBuilderContainer && sbSite) {
        // Remove our container
        scheduleBuilderContainer.remove();

        // Restore WebReg's original content
        if (window.webregOriginalContent) {
          sbSite.innerHTML = window.webregOriginalContent;
        }
      }

      console.log('🔄 Switched to WebReg content');
    });
  });
}

/**
 * Activate the Schedule Builder tab and show its content
 */
function activateScheduleBuilderTab() {
  console.log('🎯 Schedule Builder tab activated!');

  // Deactivate all other tabs
  const allTabs = document.querySelectorAll('ul.nav.navbar-nav li');
  allTabs.forEach(li => {
    li.classList.remove('active');
    const link = li.querySelector('a');
    if (link) {
      link.style.color = 'rgb(255, 255, 255)';
      link.style.backgroundColor = 'transparent';
    }
  });

  // Activate Schedule Builder tab
  const scheduleBuilderLi = document.getElementById('schBldTab');
  const scheduleBuilderLink = document.getElementById('mItSchBld');

  scheduleBuilderLi.classList.add('active');
  scheduleBuilderLink.style.color = '#ffcc00'; // USC gold
  scheduleBuilderLink.style.backgroundColor = '#790202'; // USC cardinal red

  // Push Schedule Builder state to history (gives it a proper URL)
  // This prevents navigation issues when clicking dropdowns
  if (!window.location.href.includes('#schedulebuilder')) {
    // Store the previous page URL so we can return to it
    window.scheduleBuilderPreviousUrl = window.location.pathname;

    // Push new state to history
    history.pushState(
      { page: 'schedulebuilder' },
      'myScheduleBuilder',
      window.location.pathname + '#schedulebuilder'
    );
  }

  // Clear existing page content
  clearMainContent();

  // Render Schedule Builder UI (will restore state if it exists)
  renderScheduleBuilderUI();

  // Make sure Schedule Builder container is visible
  const scheduleBuilderContainer = document.getElementById('schedule-builder-container');
  if (scheduleBuilderContainer) {
    scheduleBuilderContainer.style.display = 'block';
  }

  // Collapse mobile navbar menu if open
  const navbarCollapse = document.querySelector('.navbar-collapse');
  if (navbarCollapse && navbarCollapse.classList.contains('in')) {
    navbarCollapse.classList.remove('in');
    navbarCollapse.style.height = '0px';
  }

  // Also trigger Bootstrap collapse if it exists
  const navbarToggle = document.querySelector('.navbar-toggle');
  if (navbarToggle && !navbarToggle.classList.contains('collapsed')) {
    navbarToggle.classList.add('collapsed');
    navbarToggle.setAttribute('aria-expanded', 'false');
  }
}

/**
 * Clear the main content area and prepare for Schedule Builder
 */
function clearMainContent() {
  // DEEP FIX: Instead of hiding #sb-site and creating a sibling container,
  // we'll clear #sb-site's content and inject our UI inside it.
  // This way, we inherit #sb-site's white background behavior that extends to page bottom.
  const webregContent = document.querySelector('#sb-site');

  if (!webregContent) {
    console.error('❌ Could not find #sb-site');
    return null;
  }

  // Store reference to WebReg's original content if we haven't yet
  if (!window.webregOriginalContent) {
    // Store the original innerHTML so we can restore it later
    window.webregOriginalContent = webregContent.innerHTML;
  }

  return createScheduleBuilderContainer(webregContent);
}

/**
 * Helper: Create or reuse the Schedule Builder container
 */
function createScheduleBuilderContainer(sbSite) {
  // Find or create Schedule Builder's dedicated container
  let scheduleBuilderContainer = document.getElementById('schedule-builder-container');

  if (!scheduleBuilderContainer) {
    // Clear #sb-site's content
    sbSite.innerHTML = '';

    // Create our container and inject it INSIDE #sb-site
    scheduleBuilderContainer = document.createElement('div');
    scheduleBuilderContainer.id = 'schedule-builder-container';
    scheduleBuilderContainer.style.display = 'block';

    // Inject inside #sb-site (not as a sibling!)
    sbSite.appendChild(scheduleBuilderContainer);

    console.log('✅ Created Schedule Builder container inside #sb-site');
  } else {
    // Clear and show existing container
    scheduleBuilderContainer.innerHTML = '';
    scheduleBuilderContainer.style.display = 'block';
    console.log('✅ Reusing existing Schedule Builder container');
  }

  console.log('✅ Cleared main content container');
  return scheduleBuilderContainer;
}

/**
 * Render the Schedule Builder UI into the main content area
 */
function renderScheduleBuilderUI() {
  const container = clearMainContent();

  if (!container) {
    console.error('❌ Could not find content container');
    return;
  }

  // Inject the Schedule Builder HTML
  container.innerHTML = getScheduleBuilderHTML();

  // Attach event listeners
  attachScheduleBuilderEventListeners();

  console.log('✅ Schedule Builder UI rendered');

  // Try to load saved schedules from storage
  loadSchedulesFromStorage();

  // Legacy: Restore state if schedules were previously generated (in-memory)
  // This handles cases where schedules exist but haven't been saved yet
  if (window.currentSchedules && window.currentSchedules.length > 0) {
    console.log(`🔄 Restoring previous state with ${window.currentSchedules.length} schedules`);

    // Hide input section and loading
    // Keep input section visible for easy editing
    document.querySelector('.loading-section').style.display = 'none';

    // Show schedule display
    document.querySelector('.schedule-display').style.display = 'block';

    // Update counter
    document.getElementById('totalSchedules').textContent = window.currentSchedules.length;

    // Display the current schedule (or first one if index is invalid)
    const currentIndex = window.currentScheduleIndex || 0;
    displaySchedule(currentIndex);
  }
}

/**
 * Get the HTML template for Schedule Builder UI (v0-inspired clean design)
 */
function getScheduleBuilderHTML() {
  return `
    <div class="col-xs-12 col-sm-12 col-md-12 col-lg-12">
      <div class="schedule-builder-wrapper">
        <div class="schedule-builder-content">
          <!-- Clean Header -->
          <div class="schedule-builder-header">
            <h1>myScheduleBuilder</h1>
            <p>This Schedule Builder tool allows you to generate all possible valid schedule combinations from your selected courses. Enter your course codes below to see available scheduling options.</p>
          </div>

          <!-- Course Input Section -->
          <div class="input-section">
            <label>Enter Course Codes (comma-separated):</label>
            <div class="input-group">
              <input 
                type="text" 
                id="courseInput" 
                class="course-input" 
                placeholder="e.g., CSCI-350, MATH-407, EALC-125"
              />
              <button id="generateBtn" class="btn btn-primary">
                Generate Schedules
              </button>
            </div>

            <!-- Checkbox Filter -->
            <div style="margin-top: 12px;">
              <label style="display: inline-flex; align-items: center; gap: 8px; cursor: pointer; font-weight: normal;">
                <input type="checkbox" id="onlyOpenSections" checked>
                <span>Only include sections with available seats</span>
              </label>
            </div>
          </div>

          <!-- Loading Section -->
          <div class="loading-section" style="display: none;">
            <div class="loading-spinner"></div>
            <p class="loading-text">Fetching course sections...</p>
            <p class="loading-progress">Processing...</p>
          </div>

          <!-- Schedule Display -->
          <div class="schedule-display" style="display: none;">
            <!-- Availability Stats -->
            <div id="availabilityStats" class="availability-stats" style="display: none;">
              <!-- Will be populated with stats after fetching -->
            </div>

            <!-- Navigation -->
            <div class="schedule-nav">
              <a href="#" id="prevSchedule">← Previous</a>
              <div class="schedule-counter">
                Schedule <span id="currentSchedule">1</span> of <span id="totalSchedules">0</span>
              </div>
              <a href="#" id="nextSchedule">Next →</a>
            </div>

            <!-- Side-by-side layout: Calendar + Details Panel -->
            <div class="schedule-display-container">
              <!-- Calendar Section (Left - 70%) -->
              <div class="calendar-section">
                <div id="calendarView">
                  <!-- Calendar will be rendered here -->
                </div>
              </div>

              <!-- Details Panel (Right - 30%) -->
              <div class="details-panel">
                <!-- Section Details Card -->
                <div class="details-card">
                  <h3>Sections in This Schedule:</h3>
                  <ul id="scheduleDetailsList" class="details-list">
                    <!-- Details will be populated by JavaScript -->
                  </ul>
                </div>

                <!-- Action Buttons -->
                <div class="action-buttons">
                  <button id="addToCourseBinBtn" class="btn btn-success">
                    ✓ Add This Schedule to CourseBin
                  </button>
                  <button id="startOverBtn" class="btn btn-secondary">
                    Start Over
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Error Section -->
          <div class="error-section" style="display: none;">
            <h2>⚠️ Error</h2>
            <p id="errorMessage" class="error-text"></p>
            <button id="tryAgainBtn" class="btn btn-primary">Try Again</button>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Attach event listeners to Schedule Builder UI elements
 */
function attachScheduleBuilderEventListeners() {
  // Generate button
  const generateBtn = document.getElementById('generateBtn');
  if (generateBtn) {
    generateBtn.addEventListener('click', handleGenerateSchedules);
  }

  // Navigation buttons (now links)
  const prevBtn = document.getElementById('prevSchedule');
  const nextBtn = document.getElementById('nextSchedule');

  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateSchedule(-1);
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateSchedule(1);
    });
  }

  // Add to CourseBin button
  const addBtn = document.getElementById('addToCourseBinBtn');
  if (addBtn) {
    addBtn.addEventListener('click', handleAddToCourseBin);
  }

  // Start Over button
  const startOverBtn = document.getElementById('startOverBtn');
  if (startOverBtn) {
    startOverBtn.addEventListener('click', () => {
      if (confirm('Start over? This will clear your saved schedules.')) {
        clearSavedSchedules();
      }
    });
  }

  // Try Again button
  const tryAgainBtn = document.getElementById('tryAgainBtn');
  if (tryAgainBtn) {
    tryAgainBtn.addEventListener('click', () => {
      document.querySelector('.error-section').style.display = 'none';
      document.querySelector('.input-section').style.display = 'block';
    });
  }

  // Enter key in input
  const courseInput = document.getElementById('courseInput');
  if (courseInput) {
    courseInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleGenerateSchedules();
      }
    });
  }
}

/**
 * Handle Generate Schedules button click
 */
async function handleGenerateSchedules() {
  console.log('🎯 Generate Schedules clicked!');

  const input = document.getElementById('courseInput');
  const courseCodes = input.value.trim();

  if (!courseCodes) {
    showError('Please enter at least one course code');
    return;
  }

  // Parse course codes
  const courses = courseCodes.split(',').map(c => c.trim().toUpperCase()).filter(c => c.length > 0);

  console.log('Courses to process:', courses);

  // Show loading state
  showLoading();
  updateLoadingProgress(`Fetching ${courses.length} course${courses.length > 1 ? 's' : ''}...`);

  try {
    // Check if course-fetcher is loaded
    if (!window.ScheduleBuilder || !window.ScheduleBuilder.fetchCoursesData) {
      showError('Course fetcher module not loaded. Please reload the extension.');
      return;
    }

    // Get current term ID
    const termId = window.ScheduleBuilder.getCurrentTermId();

    // Show which courses we're fetching
    updateLoadingProgress(`Fetching: ${courses.join(', ')}`);

    // Fetch all course data
    const coursesData = await window.ScheduleBuilder.fetchCoursesData(courses, termId);

    console.log('✅ Fetched course data:', coursesData);

    // Check for errors
    const failedCourses = coursesData.filter(c => c.error || c.sections.length === 0);

    if (failedCourses.length === coursesData.length) {
      // All courses failed
      showError(`Could not find any of the specified courses. Make sure you're using the correct format (e.g., CSCI-350)`);
      return;
    }

    if (failedCourses.length > 0) {
      console.warn('Some courses failed to load:', failedCourses);
    }

    // Filter to successful courses
    const successCourses = coursesData.filter(c => !c.error && c.sections.length > 0);

    // Display availability stats to user
    displayAvailabilityStats(successCourses);

    // Check if user wants to filter out closed sections
    const onlyOpenCheckbox = document.getElementById('onlyOpenSections');
    const shouldFilterClosed = onlyOpenCheckbox && onlyOpenCheckbox.checked;

    // Filter out closed sections if checkbox is checked
    let coursesToUse = successCourses;

    if (shouldFilterClosed) {
      coursesToUse = successCourses.map(course => {
        return {
          ...course,
          sections: course.sections.filter(section => section.isOpen !== false)
        };
      }).filter(course => course.sections.length > 0);

      // Check if we have any courses with open sections
      if (coursesToUse.length === 0) {
        showError('No open sections found for any of your courses. All sections may be full. Try unchecking "Only include sections with available seats" to see all options.');
        return;
      }

      // Log filtering stats
      const totalSections = successCourses.reduce((sum, c) => sum + c.sections.length, 0);
      const openSections = coursesToUse.reduce((sum, c) => sum + c.sections.length, 0);
      console.log(`📊 Filtered sections: ${openSections} open out of ${totalSections} total`);
    } else {
      console.log('ℹ️ Including all sections (open and closed)');
    }

    // Phase 3: Generate schedules
    console.log('🎯 Starting schedule generation...');

    if (!window.ScheduleBuilder || !window.ScheduleBuilder.generateSchedules) {
      showError('Schedule generator not loaded. Please reload the extension.');
      return;
    }

    // Update loading message
    updateLoadingProgress('Generating schedules...');

    // Generate schedules (run asynchronously to keep UI responsive)
    setTimeout(() => {
      try {
        // Use coursesToUse which respects the checkbox setting
        const schedules = window.ScheduleBuilder.generateSchedules(coursesToUse, 20);

        if (schedules.length === 0) {
          showError('No valid schedules found. Your selected courses may have too many time conflicts.');
          return;
        }

        // Show the schedules
        showGeneratedSchedules(schedules, coursesToUse, failedCourses);
      } catch (error) {
        console.error('Error generating schedules:', error);
        showError(`Failed to generate schedules: ${error.message}`);
      }
    }, 100);

  } catch (error) {
    console.error('Error fetching courses:', error);
    showError(`Failed to fetch course data: ${error.message}`);
  }
}

/**
 * Show generated schedules (replaces showFetchedCourses)
 */
function showGeneratedSchedules(schedules, successCourses, failedCourses) {
  console.log(`✅ Displaying ${schedules.length} schedules`);

  // Store schedules globally for navigation
  window.currentSchedules = schedules;
  window.currentScheduleIndex = 0;

  // Save to chrome.storage for persistence
  saveSchedulesToStorage(schedules, 0);

  // Hide loading, show schedule display
  document.querySelector('.loading-section').style.display = 'none';
  // Keep input section visible
  document.querySelector('.schedule-display').style.display = 'block';

  // Update schedule counter
  document.getElementById('totalSchedules').textContent = schedules.length;

  // Display first schedule
  displaySchedule(0);
}

/**
 * Display a specific schedule by index
 */
function displaySchedule(index) {
  if (!window.currentSchedules || index < 0 || index >= window.currentSchedules.length) {
    return;
  }

  window.currentScheduleIndex = index;
  const schedule = window.currentSchedules[index];

  // Update counter
  document.getElementById('currentSchedule').textContent = index + 1;

  // Update schedule details list
  const detailsList = document.getElementById('scheduleDetailsList');
  detailsList.innerHTML = '';

  schedule.forEach(section => {
    const li = document.createElement('li');

    // Course code, type and section number  (bold)
    const typeDiv = document.createElement('div');
    typeDiv.className = 'detail-type';
    const coursePrefix = section.courseCode ? `${section.courseCode} - ` : '';
    typeDiv.textContent = `${coursePrefix}${section.type} (${section.sectionId})`;

    // Time and days
    const timeDiv = document.createElement('div');
    timeDiv.className = 'detail-time';
    timeDiv.textContent = `${section.time} on ${section.days}`;

    // Instructor and location (gray)
    const instructorDiv = document.createElement('div');
    instructorDiv.className = 'detail-instructor';
    instructorDiv.textContent = `${section.instructor} @ ${section.location}`;

    li.appendChild(typeDiv);
    li.appendChild(timeDiv);
    li.appendChild(instructorDiv);
    detailsList.appendChild(li);
  });

  // Render calendar view
  const calendarView = document.getElementById('calendarView');
  calendarView.innerHTML = ''; // Clear previous content

  if (window.ScheduleBuilder && window.ScheduleBuilder.renderCalendar) {
    window.ScheduleBuilder.renderCalendar(schedule, calendarView);
  } else {
    calendarView.innerHTML = '<p class="error-text">Calendar renderer not loaded</p>';
  }
}

/**
 * Navigate to next/previous schedule
 */
function navigateSchedule(direction) {
  if (!window.currentSchedules) {
    return;
  }

  let newIndex = window.currentScheduleIndex + direction;

  // Wrap around
  if (newIndex < 0) {
    newIndex = window.currentSchedules.length - 1;
  } else if (newIndex >= window.currentSchedules.length) {
    newIndex = 0;
  }

  displaySchedule(newIndex);

  // Save new index to storage
  chrome.storage.local.set({
    'sb_currentIndex': newIndex
  });
}

/**
 * Handle Add to CourseBin button
 */
function handleAddToCourseBin() {
  console.log('Add to CourseBin clicked!');
  // TODO: Phase 5 - Implement auto-add functionality
  alert('Auto-add feature coming in Phase 5!');
}

/**
 * Save schedules to chrome.storage for persistence
 */
function saveSchedulesToStorage(schedules, index = 0) {
  const courseInput = document.getElementById('courseInput');
  const inputValue = courseInput ? courseInput.value : '';

  chrome.storage.local.set({
    'sb_schedules': schedules,
    'sb_currentIndex': index,
    'sb_timestamp': Date.now(),
    'sb_inputCourses': inputValue
  }, () => {
    if (chrome.runtime.lastError) {
      console.error('Error saving schedules:', chrome.runtime.lastError);
    } else {
      console.log(`📦 Saved ${schedules.length} schedules to storage`);
    }
  });
}

/**
 * Load schedules from chrome.storage
 */
function loadSchedulesFromStorage() {
  chrome.storage.local.get([
    'sb_schedules',
    'sb_currentIndex',
    'sb_timestamp',
    'sb_inputCourses'
  ], (result) => {
    if (chrome.runtime.lastError) {
      console.error('Error loading schedules:', chrome.runtime.lastError);
      return;
    }

    // Check if data exists and isn't too old (7 days)
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (result.sb_schedules &&
      result.sb_timestamp &&
      (Date.now() - result.sb_timestamp < sevenDays)) {

      // Restore schedules
      window.currentSchedules = result.sb_schedules;
      window.currentScheduleIndex = result.sb_currentIndex || 0;

      // Hide input and loading
      const inputSection = document.querySelector('.input-section');
      const loadingSection = document.querySelector('.loading-section');
      const scheduleDisplay = document.querySelector('.schedule-display');

      // Keep input section visible
      if (loadingSection) loadingSection.style.display = 'none';
      if (scheduleDisplay) scheduleDisplay.style.display = 'block';

      // Restore course input
      const courseInput = document.getElementById('courseInput');
      if (result.sb_inputCourses && courseInput) {
        courseInput.value = result.sb_inputCourses;
      }

      // Update schedule counter
      const totalSchedules = document.getElementById('totalSchedules');
      if (totalSchedules) {
        totalSchedules.textContent = result.sb_schedules.length;
      }

      // Display current schedule
      displaySchedule(window.currentScheduleIndex);

      console.log(`✅ Restored ${result.sb_schedules.length} schedules from storage`);
    }
  });
}

/**
 * Clear saved schedules from storage
 */
function clearSavedSchedules() {
  chrome.storage.local.remove([
    'sb_schedules',
    'sb_currentIndex',
    'sb_timestamp',
    'sb_inputCourses'
  ], () => {
    console.log('🗑️ Cleared saved schedules');
    // Reset UI
    window.currentSchedules = null;
    window.currentScheduleIndex = 0;

    const inputSection = document.querySelector('.input-section');
    const scheduleDisplay = document.querySelector('.schedule-display');

    if (inputSection) inputSection.style.display = 'block';
    if (scheduleDisplay) scheduleDisplay.style.display = 'none';

    const courseInput = document.getElementById('courseInput');
    if (courseInput) courseInput.value = '';
  });
}


/**
 * Show loading state
 */
function showLoading() {
  // Keep input visible while loading
  document.querySelector('.schedule-display').style.display = 'none';
  document.querySelector('.error-section').style.display = 'none';
  document.querySelector('.loading-section').style.display = 'block';
}

/**
 * Show error message
 */
function showError(message) {
  // Keep input visible on error
  document.querySelector('.schedule-display').style.display = 'none';
  document.querySelector('.loading-section').style.display = 'none';

  const errorSection = document.querySelector('.error-section');
  const errorMessage = document.getElementById('errorMessage');

  errorMessage.textContent = message;
  errorSection.style.display = 'block';
}

/**
 * Display availability stats for courses
 */
function displayAvailabilityStats(courses) {
  const statsContainer = document.getElementById('availabilityStats');
  if (!statsContainer) return;

  let html = '<h4>📊 Section Availability</h4>';

  courses.forEach(course => {
    const totalSections = course.sections.length;
    const openSections = course.sections.filter(s => s.isOpen !== false).length;
    const closedSections = totalSections - openSections;

    // Determine badge style
    let badgeClass = 'badge-success';
    let statusText = `${openSections} of ${totalSections} open`;

    if (closedSections === totalSections) {
      badgeClass = 'badge-danger';
      statusText = 'All sections full';
    } else if (closedSections > 0) {
      badgeClass = 'badge-warning';
      statusText = `${openSections} of ${totalSections} open`;
    }

    // Section type breakdown
    const sectionsByType = {};
    course.sections.forEach(section => {
      const type = section.type || 'Unknown';
      if (!sectionsByType[type]) {
        sectionsByType[type] = { total: 0, open: 0 };
      }
      sectionsByType[type].total++;
      if (section.isOpen !== false) {
        sectionsByType[type].open++;
      }
    });

    const typeDetails = Object.entries(sectionsByType)
      .map(([type, counts]) => `${type}: ${counts.open}/${counts.total}`)
      .join(', ');

    html += `
      <div class="course-availability">
        <span class="course-code">${course.courseCode}</span>
        <span class="availability-badge ${badgeClass}">${statusText}</span>
        <span class="section-details">${typeDetails}</span>
      </div>
    `;
  });

  statsContainer.innerHTML = html;
  statsContainer.style.display = 'block';
}

/**
 * Update loading progress message
 */
function updateLoadingProgress(message) {
  const loadingProgress = document.querySelector('.loading-progress');
  if (loadingProgress) {
    loadingProgress.textContent = message;
  }
}

/**
 * Handle browser back/forward navigation
 */
window.addEventListener('popstate', (event) => {
  console.log('🔄 Navigation detected (back/forward button)');

  // Check if we should show Schedule Builder based on URL hash
  if (window.location.hash === '#schedulebuilder') {
    activateScheduleBuilderTab();
  } else {
    // Hide Schedule Builder, show WebReg content
    const scheduleBuilderContainer = document.getElementById('schedule-builder-container');
    if (scheduleBuilderContainer) {
      scheduleBuilderContainer.style.display = 'none';
    }

    if (window.webregOriginalContent) {
      window.webregOriginalContent.style.display = 'block';
    }
  }
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectScheduleBuilderTab);
} else {
  injectScheduleBuilderTab();
}

// Also reinitialize on navigation (for SPAs or dynamic content)
window.addEventListener('load', () => {
  injectScheduleBuilderTab();

  // Check if page loaded with #schedulebuilder hash
  if (window.location.hash === '#schedulebuilder') {
    // Small delay to ensure tab is injected first
    setTimeout(() => {
      activateScheduleBuilderTab();
    }, 100);
  }
});
