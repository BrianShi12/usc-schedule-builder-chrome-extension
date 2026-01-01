# USC Schedule Builder - Project Handbook

**Version**: 1.0.0
**Status**: Pre-Release Polish
**Tech Stack**: Chrome Extension (Manifest V3), Vanilla JS

---

## 1. Project Overview

**USC Schedule Builder** is a Chrome Extension that integrates directly into the USC WebReg system to help students generate conflict-free schedules automatically.

### Key Features
- **Native Integration**: Injects a "Schedule Builder" tab directly into WebReg pages.
- **Automatic Generation**: Uses a backtracking algorithm to find all valid non-conflicting schedules.
- **Visual Calendar**: Displays weekly schedules in a clean grid.
- **Smart Filtering**: Filters out closed sections (optional) and handles time conflicts.
- **Privacy First**: All processing runs locally in the browser; no data leaves the user's machine.

---

## 2. Quick Start

### Installation (Developer Mode)
1. Clone this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable **Developer mode** (top right toggle).
4. Click **Load unpacked**.
5. Select the `usc-schedule-builder-chrome-extension` folder.

### Usage
1. Log in to [USC WebReg](https://webreg.usc.edu/).
2. Navigate to any Department page.
3. Click the **"Schedule Builder"** tab (in the red navbar).
4. Enter course codes (e.g., `CSCI-104, MATH-225`).
5. Click **"Generate Potential Schedules"**.

---

## 3. Architecture & Core Modules

The extension operates as a **Content Script** that injects UI and logic into WebReg.

### Module Breakdown

| Module | File | Responsibility |
|--------|------|----------------|
| **Tab Injector** | `ui/tab-injector.js` | Main entry point. Injects the tab UI, handles navigation, and orchestrates the flow. |
| **Course Fetcher** | `core/course-fetcher.js` | Scrapes WebReg department pages to fetch section data (Time, Day, Location, etc.). Handles pagination. |
| **Schedule Generator** | `core/schedule-generator.js` | The logic core. Uses backtracking to generate valid combinations of sections. |
| **Time Parser** | `core/time-parser.js` | Utilities for parsing time strings (e.g., "02:00pm-03:50pm") and detecting conflicts. |
| **Calendar Renderer** | `core/calendar-renderer.js` | Draws the visual HTML table for the weekly calendar view. |
| **Debug Config** | *Inline in modules* | Controlled by `DEBUG` flag in `time-parser.js`. |

### Data Flow
1. **User Input**: User types `CSCI-104`.
2. **Fetcher**: Scrapes `/Courses?Program=CSCI` (pages 1-10) to find the course HTML block.
3. **Extraction**: Parses raw HTML to build a JSON object of sections (`Lecture`, `Discussion`, `Quiz`).
4. **Generator**:
   - Groups sections by type.
   - Puts them into a backtracking solver.
   - Prunes branches with time conflicts.
5. **Renderer**: Takes the valid schedule list and draws the current one on screen.

---

## 4. Development History & Key Decisions

### Phase 1: Research & UI
- **Decision**: Inject into `#sb-site` instead of an iframe or popup to inherit native CSS/Auth.
- **Challenge**: WebReg's CSS is old/messy. Used specific ID selectors to override styles without breaking the page.

### Phase 2: Data Fetching (The Hard Part)
- **Problem**: WebReg has no API.
- **Solution**: DOM Scraping.
- **Critical Bug Fixed**: **Pagination**. WebReg only shows 25 courses per page.
  - *Fix*: The fetcher now loops `pageNumber=1` to `10` until the course is found.
- **Constraint**: Must respect "Linked Sections" (some lectures require specific discussions).
  - *Approach*: Added a user warning rather than complex parsing logic for V1.

### Phase 3: Algorithm
- **Algorithm**: Recursive Backtracking.
- **Optimization**: Limits to 100 schedules max to prevent browser freezing on massive combinations.
- **Diversity**: Intelligently selects "variants" to ensure users see different lecture time options, not just 50 variations of the same lecture with different quizzes.

### Phase 4: Visualization
- **UI**: CSS Grid/Table hybrid.
- **Security**: Fixed XSS vulnerability by using `textContent` instead of `innerHTML` for course labels.

---

## 5. Debugging

### The DEBUG Flag
Debug logging is centralized.

**To Enable:**
1. Open `core/time-parser.js`.
2. Set `const DEBUG = true;`.
3. Reload extension.

**To Disable (Production):**
1. Set `const DEBUG = false;`.
2. Console will be clean.

---

## 6. Release Guide (Chrome Web Store)

### Assets Required
- **Icons**: `128x128` (Required), `48x48` (Recommended).
- **Screenshots**: 1280x800 or 640x400 (at least 1).
- **Zip File**: Entire project folder (excluding `.git` and `.gemini`).

### Submission Checklist
1. [ ] **Version Bump**: Update `version` in `manifest.json`.
2. [ ] **Debug Flag**: Ensure `DEBUG = false`.
3. [ ] **Zip**: Compress folder.
4. [ ] **Upload**: Submit to Chrome Developer Dashboard.

### Store Description
(See separate `STORE_DESCRIPTION.md` or copy from below)

**Summary**: Automatically generate conflict-free schedules for USC WebReg. Visualize your week, filter unavailable seats, and build the perfect schedule.

**Detailed Description**:
Build the perfect USC schedule in seconds, right inside WebReg.
Stop manually checking for time conflicts or drawing schedules on paper. The USC Schedule Builder integrates seamlessly into the native WebReg experience to help you find the best possible class combination.

**Key Features:**
✅ **Automatic Schedule Generation**: Input your desired courses (e.g., CSCI-104, MATH-225), and instantly see every valid, non-conflicting schedule combination.
✅ **One-Click Visualization**: View your weekly schedule in a clean, color-coded calendar grid.
✅ **Smart Filtering**: Automatically hides sections that are closed or conflicting. Option to "Only include sections with available seats."
✅ **Native Integration**: Works directly within the USC WebReg "Department" pages—no need to switch tabs or use external websites.
✅ **Privacy First**: All processing happens locally in your browser. No personal data is ever collected or transmitted.

---

## 7. Known Issues / Limitations
- **Linked Sections**: Not enforced programmatically. Warning added for user verification.
- **CourseBin Integration**: "Add to CourseBin" button hidden in V1 due to CSRF complexity.
- **Pagination**: Fetches max 10 pages (250 courses). Theoretically a department could be larger, but unlikely.

---

*Generated by Antigravity Agent - Dec 2025*
