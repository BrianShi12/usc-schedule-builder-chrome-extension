/**
 * Linked Sections Algorithm Test Suite (Simplified)
 * 
 * Only 2 patterns matter:
 * - INTERLEAVED: Lec → Disc → Lec → Disc (enforce linking)
 * - GROUPED: Everything else (any-to-any)
 */

console.log('🧪 Starting Linked Sections Algorithm Tests...\n');

function testAnalyzeCourseStructure(sections) {
    const discussions = sections.filter(s => s.type === 'Discussion');
    const lectures = sections.filter(s =>
        s.type === 'Lecture' || s.type === 'Lecture-Discussion'
    );

    if (discussions.length === 0 || lectures.length < 2) {
        return { pattern: 'GROUPED' };
    }

    let lastLectureId = null;
    let sawDiscAfterLec = false;
    let sawLecAfterDisc = false;

    sections.forEach((section) => {
        if (section.type === 'Lecture') {
            if (sawDiscAfterLec) sawLecAfterDisc = true;
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

function createSection(id, type) {
    return { sectionId: id, type: type };
}

const testCases = [
    {
        name: "INTERLEAVED: Lec → Disc → Lec → Disc",
        sections: [
            createSection("L1", "Lecture"),
            createSection("D1", "Discussion"),
            createSection("L2", "Lecture"),
            createSection("D2", "Discussion"),
        ],
        expectedPattern: "INTERLEAVED",
        expectedLinks: { D1: "L1", D2: "L2" }
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
        expectedLinks: {}
    },
    {
        name: "GROUPED: Single lecture (less than 2 lectures)",
        sections: [
            createSection("L1", "Lecture"),
            createSection("D1", "Discussion"),
            createSection("D2", "Discussion"),
        ],
        expectedPattern: "GROUPED",  // Simplified - no linking needed
        expectedLinks: {}
    },
    {
        name: "GROUPED: No discussions",
        sections: [
            createSection("L1", "Lecture"),
            createSection("Lab1", "Lab"),
        ],
        expectedPattern: "GROUPED",
        expectedLinks: {}
    },
    {
        name: "GROUPED: Labs between lectures",
        sections: [
            createSection("L1", "Lecture"),
            createSection("Lab1", "Lab"),
            createSection("L2", "Lecture"),
            createSection("D1", "Discussion"),
        ],
        expectedPattern: "GROUPED",
        expectedLinks: {}
    },
    {
        name: "INTERLEAVED: Complex pattern",
        sections: [
            createSection("L1", "Lecture"),
            createSection("D1", "Discussion"),
            createSection("L2", "Lecture"),
            createSection("D2", "Discussion"),
            createSection("D3", "Discussion"),
        ],
        expectedPattern: "INTERLEAVED",
        expectedLinks: { D1: "L1", D2: "L2", D3: "L2" }
    },
];

let passed = 0, failed = 0;

testCases.forEach((test, index) => {
    const sections = JSON.parse(JSON.stringify(test.sections));
    const result = testAnalyzeCourseStructure(sections);
    const patternMatch = result.pattern === test.expectedPattern;

    let linksMatch = true;
    const discussions = sections.filter(s => s.type === 'Discussion');
    for (const disc of discussions) {
        const expected = test.expectedLinks[disc.sectionId];
        const actual = disc.parentLectureId;
        if (expected && actual !== expected) linksMatch = false;
        if (!expected && actual) linksMatch = false;
    }

    if (patternMatch && linksMatch) {
        console.log(`✅ Test ${index + 1}: ${test.name} → ${result.pattern}`);
        passed++;
    } else {
        console.log(`❌ Test ${index + 1}: ${test.name}`);
        console.log(`   Expected: ${test.expectedPattern}, Got: ${result.pattern}`);
        failed++;
    }
});

console.log('\n' + '═'.repeat(50));
console.log(`🧪 Results: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(50));
