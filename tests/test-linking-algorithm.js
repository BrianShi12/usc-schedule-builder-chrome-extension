/**
 * Linked Sections Algorithm Test Suite
 * 
 * Run this in browser console on WebReg after loading the extension:
 * Copy-paste this entire file into the console and press Enter.
 * 
 * Or load via: <script src="tests/test-linking-algorithm.js"></script>
 */

console.log('🧪 Starting Linked Sections Algorithm Tests...\n');

// Copy of the algorithm for testing (same logic as course-fetcher.js)
function testAnalyzeCourseStructure(sections) {
    const lectures = sections.filter(s =>
        s.type === 'Lecture' || s.type === 'Lecture-Discussion'
    );
    const discussions = sections.filter(s => s.type === 'Discussion');
    const labs = sections.filter(s => s.type === 'Lab');

    // Case 1: Combined "Lecture-Discussion" type
    if (lectures.some(l => l.type === 'Lecture-Discussion') && discussions.length === 0) {
        return { pattern: 'COMBINED' };
    }

    // Case 2: No discussions at all
    if (discussions.length === 0) {
        return { pattern: 'NO_DISCUSSIONS' };
    }

    // Case 3: Single lecture
    if (lectures.length === 1) {
        const lectureId = lectures[0].sectionId;
        discussions.forEach(d => { d.parentLectureId = lectureId; });
        labs.forEach(l => { l.parentLectureId = lectureId; });
        return { pattern: 'SINGLE_LECTURE' };
    }

    // Case 4: Detect INTERLEAVED vs GROUPED
    let lastLectureId = null;
    let sawDiscAfterLec = false;
    let sawLecAfterDisc = false;

    sections.forEach((section) => {
        if (section.type === 'Lecture') {
            if (sawDiscAfterLec) {
                sawLecAfterDisc = true;
            }
            lastLectureId = section.sectionId;
        } else if (section.type === 'Discussion') {
            if (lastLectureId !== null) {
                sawDiscAfterLec = true;
                section.parentLectureId = lastLectureId;
            }
        }
    });

    if (sawLecAfterDisc) {
        return { pattern: 'INTERLEAVED' };
    } else {
        discussions.forEach(d => { delete d.parentLectureId; });
        return { pattern: 'GROUPED' };
    }
}

// Test helper
function createSection(id, type) {
    return { sectionId: id, type: type };
}

// Test cases
const testCases = [
    {
        name: "INTERLEAVED: Lec → Disc → Lec → Disc",
        sections: [
            createSection("L1", "Lecture"),
            createSection("D1", "Discussion"),
            createSection("D2", "Discussion"),
            createSection("L2", "Lecture"),
            createSection("D3", "Discussion"),
            createSection("D4", "Discussion"),
        ],
        expectedPattern: "INTERLEAVED",
        expectedLinks: { D1: "L1", D2: "L1", D3: "L2", D4: "L2" }
    },
    {
        name: "GROUPED: Lec → Lec → Disc → Disc",
        sections: [
            createSection("L1", "Lecture"),
            createSection("L2", "Lecture"),
            createSection("D1", "Discussion"),
            createSection("D2", "Discussion"),
        ],
        expectedPattern: "GROUPED",
        expectedLinks: {} // No parentLectureId for GROUPED
    },
    {
        name: "GROUPED: Lec → Labs → Lec → Disc (PHYS-135A style)",
        sections: [
            createSection("L1", "Lecture"),
            createSection("Lab1", "Lab"),
            createSection("Lab2", "Lab"),
            createSection("Lab3", "Lab"),
            createSection("L2", "Lecture"),
            createSection("D1", "Discussion"),
        ],
        expectedPattern: "GROUPED",
        expectedLinks: {}
    },
    {
        name: "SINGLE_LECTURE: One lecture, many discussions",
        sections: [
            createSection("L1", "Lecture"),
            createSection("D1", "Discussion"),
            createSection("D2", "Discussion"),
            createSection("D3", "Discussion"),
        ],
        expectedPattern: "SINGLE_LECTURE",
        expectedLinks: { D1: "L1", D2: "L1", D3: "L1" }
    },
    {
        name: "COMBINED: Lecture-Discussion type, no separate discussions",
        sections: [
            createSection("Lab1", "Lab"),
            createSection("Lab2", "Lab"),
            createSection("LD1", "Lecture-Discussion"),
            createSection("Q1", "Quiz"),
        ],
        expectedPattern: "COMBINED",
        expectedLinks: {}
    },
    {
        name: "NO_DISCUSSIONS: Only lectures and labs",
        sections: [
            createSection("L1", "Lecture"),
            createSection("Lab1", "Lab"),
            createSection("Lab2", "Lab"),
        ],
        expectedPattern: "NO_DISCUSSIONS",
        expectedLinks: {}
    },
    {
        name: "COMPLEX: Lec → Disc → Quiz → Lec → Disc → Disc → Lec → Disc → Lab",
        sections: [
            createSection("L1", "Lecture"),
            createSection("D1", "Discussion"),
            createSection("Q1", "Quiz"),
            createSection("L2", "Lecture"),
            createSection("D2", "Discussion"),
            createSection("D3", "Discussion"),
            createSection("L3", "Lecture"),
            createSection("D4", "Discussion"),
            createSection("Lab1", "Lab"),
        ],
        expectedPattern: "INTERLEAVED",
        expectedLinks: { D1: "L1", D2: "L2", D3: "L2", D4: "L3" }
    },
    {
        name: "GROUPED: Labs first, then lecture, then discussion (CHEM style)",
        sections: [
            createSection("Lab1", "Lab"),
            createSection("Lab2", "Lab"),
            createSection("Lab3", "Lab"),
            createSection("L1", "Lecture"),
            createSection("D1", "Discussion"),
        ],
        expectedPattern: "SINGLE_LECTURE",  // Only 1 lecture!
        expectedLinks: { D1: "L1" }
    },
    {
        name: "GROUPED: Multiple labs first, multiple lectures, then discussions",
        sections: [
            createSection("Lab1", "Lab"),
            createSection("Lab2", "Lab"),
            createSection("L1", "Lecture"),
            createSection("L2", "Lecture"),
            createSection("D1", "Discussion"),
            createSection("D2", "Discussion"),
        ],
        expectedPattern: "GROUPED",
        expectedLinks: {}
    },
];

// Run tests
let passed = 0;
let failed = 0;

testCases.forEach((test, index) => {
    // Clone sections to avoid mutation between tests
    const sections = JSON.parse(JSON.stringify(test.sections));

    const result = testAnalyzeCourseStructure(sections);

    // Check pattern
    const patternMatch = result.pattern === test.expectedPattern;

    // Check links
    let linksMatch = true;
    const discussions = sections.filter(s => s.type === 'Discussion');

    for (const disc of discussions) {
        const expectedParent = test.expectedLinks[disc.sectionId];
        const actualParent = disc.parentLectureId;

        if (expectedParent && actualParent !== expectedParent) {
            linksMatch = false;
            console.log(`    ❌ ${disc.sectionId} linked to ${actualParent}, expected ${expectedParent}`);
        } else if (!expectedParent && actualParent) {
            linksMatch = false;
            console.log(`    ❌ ${disc.sectionId} has unexpected link to ${actualParent}`);
        }
    }

    if (patternMatch && linksMatch) {
        console.log(`✅ Test ${index + 1}: ${test.name}`);
        console.log(`   Pattern: ${result.pattern}`);
        passed++;
    } else {
        console.log(`❌ Test ${index + 1}: ${test.name}`);
        console.log(`   Expected: ${test.expectedPattern}, Got: ${result.pattern}`);
        if (!linksMatch) {
            console.log(`   Links mismatch (see above)`);
        }
        failed++;
    }
    console.log('');
});

console.log('═'.repeat(50));
console.log(`🧪 Test Results: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(50));

if (failed === 0) {
    console.log('🎉 All tests passed! Algorithm is working correctly.');
} else {
    console.log('⚠️ Some tests failed. Review the algorithm.');
}
