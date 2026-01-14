# Future Roadmap & Developer Notes

## ✅ Completed

### 1. Linked Sections Support ✅ (v1.1)
**Status**: Implemented and tested
**Changes**:
- Added `analyzeCourseStructure()` to detect INTERLEAVED, GROUPED, SINGLE_LECTURE, COMBINED patterns
- Assigns `parentLectureId` to discussions in INTERLEAVED pattern
- Schedule generator filters discussions based on chosen lecture
- Test suite: `tests/test-linking-algorithm.js` (9/9 tests passing)

## 🚀 Medium Priority (Automation & UX)

### 2. "Add to CourseBin" Automation
**The Problem**: Users currently have to manually go back to the course list and find the specific section IDs to add them to their bin.
**The Fix**:
- Implement the "Add to CourseBin" button functionality.
- Reverse-engineer the WebReg `POST` requests or simulate clicks on the specific `Add` buttons for the chosen sections.
- **Challenge**: Handling CSRF tokens and WebReg's AJAX state management.

### 3. Time Blocking (Personal Constraints)
**The Problem**: Students have lives outside of class (work, sports, sleep preferences).
**The Fix**:
- Add a "Block Time" mode to the calendar.
- Allow users to drag-and-drop "Busy" blocks (e.g., "No strings before 10 AM", "Work 2-5 PM").
- Treat these blocks as immutable conflicts in the `schedule-generator.js`.

## 🔮 Long Term / Nice-to-Have

### 4. Saved Schedules (Persistence)
**The Problem**: Browsing 20 schedules is overwhelming, and it's hard to compare "Option 37" vs "Option 52".
**The Fix**:
- Add a "Star" or "Save" button to individual schedules.
- Create a "Saved Schedules" tab to compare favorites side-by-side.

### 5. UI Polish
- Better mobile responsiveness (though WebReg desktop is primary).
- "Share Schedule" (export to image or link).



### 6. User-Chosen Schedule Count ✅ (v1.2)
**Status**: Implemented
**Changes**:
- Added slider (5-50 range, default 20) to UI
- Live display of selected value
- generateSchedules() now respects user's choice

### 7. Improve schedule generation algorithm
- Should include randomization so that is it not deterministic and a new schedule can be generated every single time. 
- Should be an option to regenerate the schedules

