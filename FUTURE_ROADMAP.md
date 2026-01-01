# Future Roadmap & Developer Notes

## 🚨 High Priority (Critical for Correctness)

### 1. Linked Sections Support
**The Problem**: Currently, the algorithm assumes any discussion section can pair with any lecture. In reality, many courses (like CSCI-104 or CSCI-356) have "Linked Sections" where specific lectures must be paired with specific subsets of discussions/labs.
**The Fix**:
- Parse the WebReg HTML structure to detect these groupings (usually indented under the lecture).
- Update `course-fetcher.js` to store this hierarchy.
- Update `schedule-generator.js` to enforce these constraints during graph traversal.
**Impact**: Prevents users from falling in love with a schedule that WebReg will reject.

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



### 6. User chosen number of schedules to generate
**The Problem**: The current algorithm generates 20 schedules, which doesn't encompass everyone's needs.
**The Fix**:
- Add a slider or input field to control the number of schedules generated.
- Update `schedule-generator.js` to respect this limit.
