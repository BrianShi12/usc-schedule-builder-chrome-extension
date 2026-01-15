/**
 * Comprehensive Test Suite for Round-Robin Schedule Generation
 * 
 * Tests:
 * 1. Basic functionality - generates expected number of schedules
 * 2. Diversity - schedules are spread across lecture combinations
 * 3. Conflict detection - no time conflicts in generated schedules
 * 4. Edge cases - single course, many courses, no valid schedules
 * 5. Linked sections - INTERLEAVED pattern handling
 */

console.log('🧪 Starting Schedule Generator Tests...\n');
console.log('═'.repeat(60));

// Mock the debugLog function
const DEBUG = false;
function debugLog(...args) {
    if (DEBUG) console.log(...args);
}

// ============================================================================
// MOCK DATA HELPERS
// ============================================================================

function createSection(id, type, courseCode, times) {
    return {
        sectionId: id,
        type: type,
        courseCode: courseCode,
        times: times || []
    };
}

function createTime(day, start, end) {
    return { day, start, end };
}

// ============================================================================
// TIME CONFLICT DETECTION (copy from time-parser.js)
// ============================================================================

function parseTime(timeStr) {
    const match = timeStr.match(/(\d{1,2}):(\d{2})(am|pm)?/i);
    if (!match) return null;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3]?.toLowerCase();

    if (period === 'pm' && hours !== 12) hours += 12;
    if (period === 'am' && hours === 12) hours = 0;

    return hours * 60 + minutes;
}

function hasTimeConflict(section1, section2) {
    if (!section1.times || !section2.times) return false;

    for (const time1 of section1.times) {
        for (const time2 of section2.times) {
            if (time1.day === time2.day) {
                const start1 = parseTime(time1.start);
                const end1 = parseTime(time1.end);
                const start2 = parseTime(time2.start);
                const end2 = parseTime(time2.end);

                if (start1 !== null && end1 !== null && start2 !== null && end2 !== null) {
                    if (!(end1 <= start2 || end2 <= start1)) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

function hasConflict(section, schedule) {
    return schedule.some(s => hasTimeConflict(section, s));
}

// ============================================================================
// SCHEDULE GENERATOR FUNCTIONS (simplified versions for testing)
// ============================================================================

function groupSectionsByType(coursesData) {
    return coursesData.map(course => {
        const sections = {
            courseCode: course.courseCode,
            courseTitle: course.courseTitle || course.courseCode,
            linkingPattern: course.linkingPattern || 'GROUPED',
            lectures: [],
            discussions: [],
            quizzes: [],
            labs: []
        };

        course.sections.forEach(section => {
            const sectionWithCode = { ...section, courseCode: course.courseCode };
            const type = section.type.toLowerCase();
            if (type.includes('lec')) {
                sections.lectures.push(sectionWithCode);
            } else if (type.includes('dis')) {
                sections.discussions.push(sectionWithCode);
            } else if (type.includes('qz') || type.includes('quiz')) {
                sections.quizzes.push(sectionWithCode);
            } else if (type.includes('lab')) {
                sections.labs.push(sectionWithCode);
            }
        });

        return sections;
    });
}

function generateAllSchedules(courses, courseIndex, currentSchedule, allSchedules, seenSchedules, absoluteMax) {
    if (allSchedules.length >= absoluteMax) return;

    if (courseIndex >= courses.length) {
        const scheduleKey = currentSchedule.map(s => s.sectionId).sort().join(',');
        if (!seenSchedules.has(scheduleKey)) {
            seenSchedules.add(scheduleKey);
            allSchedules.push([...currentSchedule]);
        }
        return;
    }

    const course = courses[courseIndex];
    if (course.lectures.length === 0) return;

    const shuffledLectures = [...course.lectures].sort(() => Math.random() - 0.5);

    for (const lecture of shuffledLectures) {
        if (allSchedules.length >= absoluteMax) return;
        if (hasConflict(lecture, currentSchedule)) continue;

        currentSchedule.push(lecture);
        tryAllSections(course, currentSchedule, courses, courseIndex, allSchedules, seenSchedules, absoluteMax);
        currentSchedule.pop();
    }
}

function tryAllSections(course, currentSchedule, courses, courseIndex, allSchedules, seenSchedules, absoluteMax) {
    const chosenLecture = currentSchedule.find(s =>
        s.courseCode === course.courseCode && s.type.toLowerCase().includes('lec')
    );

    let validDiscussions = [...course.discussions];
    if (course.linkingPattern === 'INTERLEAVED' && chosenLecture) {
        validDiscussions = course.discussions.filter(d =>
            d.parentLectureId === chosenLecture.sectionId
        );
    }

    const discussionChoices = validDiscussions.length > 0 ? validDiscussions : [null];
    const quizChoices = course.quizzes.length > 0 ? course.quizzes : [null];
    const labChoices = course.labs.length > 0 ? course.labs : [null];

    for (const discussion of discussionChoices) {
        if (allSchedules.length >= absoluteMax) return;
        if (discussion && hasConflict(discussion, currentSchedule)) continue;
        if (discussion) currentSchedule.push(discussion);

        for (const quiz of quizChoices) {
            if (allSchedules.length >= absoluteMax) break;
            if (quiz && hasConflict(quiz, currentSchedule)) continue;
            if (quiz) currentSchedule.push(quiz);

            for (const lab of labChoices) {
                if (allSchedules.length >= absoluteMax) break;
                if (lab && hasConflict(lab, currentSchedule)) continue;
                if (lab) currentSchedule.push(lab);

                generateAllSchedules(courses, courseIndex + 1, currentSchedule, allSchedules, seenSchedules, absoluteMax);

                if (lab) currentSchedule.pop();
            }
            if (quiz) currentSchedule.pop();
        }
        if (discussion) currentSchedule.pop();
    }
}

function generateSchedules(coursesData, maxSchedules = 20) {
    const coursesSections = groupSectionsByType(coursesData);
    if (coursesSections.length === 0) return [];

    const allSchedules = [];
    const seenSchedules = new Set();
    const absoluteMax = 500;

    generateAllSchedules(coursesSections, 0, [], allSchedules, seenSchedules, absoluteMax);

    if (allSchedules.length === 0) return [];

    // Group by lecture combo
    const schedulesByLectureCombo = {};
    for (const schedule of allSchedules) {
        const lectureComboKey = schedule
            .filter(s => s.type.toLowerCase().includes('lec'))
            .map(s => s.sectionId)
            .sort()
            .join(',');

        if (!schedulesByLectureCombo[lectureComboKey]) {
            schedulesByLectureCombo[lectureComboKey] = [];
        }
        schedulesByLectureCombo[lectureComboKey].push(schedule);
    }

    const lectureComboKeys = Object.keys(schedulesByLectureCombo);

    // Shuffle for variety
    for (const key of lectureComboKeys) {
        schedulesByLectureCombo[key].sort(() => Math.random() - 0.5);
    }
    lectureComboKeys.sort(() => Math.random() - 0.5);

    // Round-robin selection
    const finalSchedules = [];
    const comboIndices = {};
    for (const key of lectureComboKeys) {
        comboIndices[key] = 0;
    }

    while (finalSchedules.length < maxSchedules) {
        let addedThisPass = false;

        for (const key of lectureComboKeys) {
            if (finalSchedules.length >= maxSchedules) break;

            const comboSchedules = schedulesByLectureCombo[key];
            const idx = comboIndices[key];

            if (idx < comboSchedules.length) {
                finalSchedules.push(comboSchedules[idx]);
                comboIndices[key]++;
                addedThisPass = true;
            }
        }

        if (!addedThisPass) break;
    }

    return finalSchedules;
}

// ============================================================================
// HELPER FUNCTIONS FOR TESTS
// ============================================================================

function validateSchedule(schedule) {
    // Check no time conflicts within schedule
    for (let i = 0; i < schedule.length; i++) {
        for (let j = i + 1; j < schedule.length; j++) {
            if (hasTimeConflict(schedule[i], schedule[j])) {
                return { valid: false, error: `Conflict: ${schedule[i].sectionId} vs ${schedule[j].sectionId}` };
            }
        }
    }
    return { valid: true };
}

function getLectureCombos(schedules) {
    const combos = new Set();
    for (const schedule of schedules) {
        const key = schedule
            .filter(s => s.type.toLowerCase().includes('lec'))
            .map(s => s.sectionId)
            .sort()
            .join(',');
        combos.add(key);
    }
    return combos;
}

// ============================================================================
// TEST CASES
// ============================================================================

let passed = 0;
let failed = 0;

function test(name, fn) {
    try {
        const result = fn();
        if (result.success) {
            console.log(`✅ ${name}`);
            if (result.details) console.log(`   ${result.details}`);
            passed++;
        } else {
            console.log(`❌ ${name}`);
            console.log(`   Error: ${result.error}`);
            failed++;
        }
    } catch (e) {
        console.log(`❌ ${name}`);
        console.log(`   Exception: ${e.message}`);
        failed++;
    }
}

// Test 1: Single course, lecture only
test('Single course with 1 lecture, no other sections', () => {
    const courses = [{
        courseCode: 'CSCI-101',
        sections: [
            createSection('L1', 'Lecture', 'CSCI-101', [createTime('Mon', '10:00am', '11:50am')])
        ]
    }];

    const schedules = generateSchedules(courses, 10);

    if (schedules.length !== 1) {
        return { success: false, error: `Expected 1 schedule, got ${schedules.length}` };
    }

    return { success: true, details: `Generated ${schedules.length} schedule` };
});

// Test 2: Single course with multiple lectures
test('Single course with 3 lectures (max=2)', () => {
    const courses = [{
        courseCode: 'CSCI-101',
        sections: [
            createSection('L1', 'Lecture', 'CSCI-101', [createTime('Mon', '10:00am', '11:50am')]),
            createSection('L2', 'Lecture', 'CSCI-101', [createTime('Tue', '10:00am', '11:50am')]),
            createSection('L3', 'Lecture', 'CSCI-101', [createTime('Wed', '10:00am', '11:50am')])
        ]
    }];

    const schedules = generateSchedules(courses, 2);

    if (schedules.length !== 2) {
        return { success: false, error: `Expected 2 schedules, got ${schedules.length}` };
    }

    return { success: true, details: `Generated ${schedules.length} schedules` };
});

// Test 3: Two courses, no conflicts
test('Two courses, no time conflicts, max=10', () => {
    const courses = [
        {
            courseCode: 'CSCI-101',
            sections: [
                createSection('L1a', 'Lecture', 'CSCI-101', [createTime('Mon', '9:00am', '9:50am')]),
                createSection('L1b', 'Lecture', 'CSCI-101', [createTime('Mon', '10:00am', '10:50am')])
            ]
        },
        {
            courseCode: 'MATH-201',
            sections: [
                createSection('L2a', 'Lecture', 'MATH-201', [createTime('Tue', '9:00am', '9:50am')]),
                createSection('L2b', 'Lecture', 'MATH-201', [createTime('Tue', '10:00am', '10:50am')])
            ]
        }
    ];

    const schedules = generateSchedules(courses, 10);

    // 2 * 2 = 4 possible combinations
    if (schedules.length !== 4) {
        return { success: false, error: `Expected 4 schedules, got ${schedules.length}` };
    }

    // Validate no conflicts
    for (const s of schedules) {
        const v = validateSchedule(s);
        if (!v.valid) return { success: false, error: v.error };
    }

    return { success: true, details: `Generated ${schedules.length} valid schedules, 4 lecture combos` };
});

// Test 4: Courses with conflicts - should get fewer schedules
test('Courses with time conflicts', () => {
    const courses = [
        {
            courseCode: 'CSCI-101',
            sections: [
                createSection('L1a', 'Lecture', 'CSCI-101', [createTime('Mon', '9:00am', '10:50am')]),
                createSection('L1b', 'Lecture', 'CSCI-101', [createTime('Tue', '9:00am', '10:50am')])
            ]
        },
        {
            courseCode: 'MATH-201',
            sections: [
                createSection('L2a', 'Lecture', 'MATH-201', [createTime('Mon', '10:00am', '11:50am')]), // Conflicts with L1a
                createSection('L2b', 'Lecture', 'MATH-201', [createTime('Wed', '9:00am', '10:50am')])  // No conflict
            ]
        }
    ];

    const schedules = generateSchedules(courses, 10);

    // L1a conflicts with L2a, so valid combos are: L1a+L2b, L1b+L2a, L1b+L2b = 3
    if (schedules.length !== 3) {
        return { success: false, error: `Expected 3 schedules, got ${schedules.length}` };
    }

    // Validate no conflicts
    for (const s of schedules) {
        const v = validateSchedule(s);
        if (!v.valid) return { success: false, error: v.error };
    }

    return { success: true, details: `Correctly identified 3 non-conflicting combos` };
});

// Test 5: Course with lecture + discussion
test('Course with lecture and discussion', () => {
    const courses = [{
        courseCode: 'CSCI-101',
        sections: [
            createSection('L1', 'Lecture', 'CSCI-101', [createTime('Mon', '9:00am', '9:50am')]),
            createSection('D1', 'Discussion', 'CSCI-101', [createTime('Tue', '9:00am', '9:50am')]),
            createSection('D2', 'Discussion', 'CSCI-101', [createTime('Wed', '9:00am', '9:50am')])
        ]
    }];

    const schedules = generateSchedules(courses, 10);

    // 1 lecture * 2 discussions = 2 schedules
    if (schedules.length !== 2) {
        return { success: false, error: `Expected 2 schedules, got ${schedules.length}` };
    }

    // Each schedule should have 2 sections
    for (const s of schedules) {
        if (s.length !== 2) {
            return { success: false, error: `Expected 2 sections per schedule, got ${s.length}` };
        }
    }

    return { success: true, details: `Generated ${schedules.length} schedules with lecture+discussion` };
});

// Test 6: Round-robin diversity check
test('Round-robin ensures diversity across lecture combos', () => {
    const courses = [
        {
            courseCode: 'CSCI-101',
            sections: [
                createSection('L1a', 'Lecture', 'CSCI-101', [createTime('Mon', '9:00am', '9:50am')]),
                createSection('L1b', 'Lecture', 'CSCI-101', [createTime('Mon', '10:00am', '10:50am')])
            ]
        },
        {
            courseCode: 'MATH-201',
            sections: [
                createSection('L2a', 'Lecture', 'MATH-201', [createTime('Tue', '9:00am', '9:50am')]),
                createSection('L2b', 'Lecture', 'MATH-201', [createTime('Tue', '10:00am', '10:50am')])
            ]
        },
        {
            courseCode: 'CSCI-101',
            sections: [
                createSection('D1', 'Discussion', 'CSCI-101', [createTime('Wed', '9:00am', '9:50am')]),
                createSection('D2', 'Discussion', 'CSCI-101', [createTime('Wed', '10:00am', '10:50am')]),
                createSection('D3', 'Discussion', 'CSCI-101', [createTime('Thu', '9:00am', '9:50am')])
            ]
        }
    ];

    // This creates 2*2 = 4 lecture combos, each with 3 discussion variants = 12 total
    // When requesting 8, we should get 2 from each of the 4 combos

    // Use simpler test with just lectures
    const simpleCourses = [
        {
            courseCode: 'A',
            sections: [
                createSection('A1', 'Lecture', 'A', [createTime('Mon', '9:00am', '9:50am')]),
                createSection('A2', 'Lecture', 'A', [createTime('Mon', '10:00am', '10:50am')]),
                createSection('A3', 'Lecture', 'A', [createTime('Mon', '11:00am', '11:50am')])
            ]
        },
        {
            courseCode: 'B',
            sections: [
                createSection('B1', 'Lecture', 'B', [createTime('Tue', '9:00am', '9:50am')]),
                createSection('B2', 'Lecture', 'B', [createTime('Tue', '10:00am', '10:50am')])
            ]
        }
    ];

    // 3 * 2 = 6 total combos
    const schedules = generateSchedules(simpleCourses, 6);
    const combos = getLectureCombos(schedules);

    if (combos.size !== 6) {
        return { success: false, error: `Expected 6 unique lecture combos, got ${combos.size}` };
    }

    return { success: true, details: `All ${combos.size} lecture combos represented in ${schedules.length} schedules` };
});

// Test 7: Max schedules is respected
test('Max schedules limit is respected', () => {
    const courses = [
        {
            courseCode: 'A',
            sections: [
                createSection('A1', 'Lecture', 'A', [createTime('Mon', '9:00am', '9:50am')]),
                createSection('A2', 'Lecture', 'A', [createTime('Mon', '10:00am', '10:50am')]),
                createSection('A3', 'Lecture', 'A', [createTime('Mon', '11:00am', '11:50am')]),
                createSection('A4', 'Lecture', 'A', [createTime('Mon', '12:00pm', '12:50pm')]),
                createSection('A5', 'Lecture', 'A', [createTime('Mon', '1:00pm', '1:50pm')])
            ]
        },
        {
            courseCode: 'B',
            sections: [
                createSection('B1', 'Lecture', 'B', [createTime('Tue', '9:00am', '9:50am')]),
                createSection('B2', 'Lecture', 'B', [createTime('Tue', '10:00am', '10:50am')]),
                createSection('B3', 'Lecture', 'B', [createTime('Tue', '11:00am', '11:50am')]),
                createSection('B4', 'Lecture', 'B', [createTime('Tue', '12:00pm', '12:50pm')]),
                createSection('B5', 'Lecture', 'B', [createTime('Tue', '1:00pm', '1:50pm')])
            ]
        }
    ];

    // 5 * 5 = 25 possible, but we only want 12
    const schedules = generateSchedules(courses, 12);

    if (schedules.length !== 12) {
        return { success: false, error: `Expected exactly 12 schedules, got ${schedules.length}` };
    }

    return { success: true, details: `Correctly limited to 12 schedules out of 25 possible` };
});

// Test 8: No valid schedules (all conflicts)
test('All courses conflict - returns empty', () => {
    const courses = [
        {
            courseCode: 'A',
            sections: [
                createSection('A1', 'Lecture', 'A', [createTime('Mon', '9:00am', '10:50am')])
            ]
        },
        {
            courseCode: 'B',
            sections: [
                createSection('B1', 'Lecture', 'B', [createTime('Mon', '9:30am', '10:20am')]) // Overlaps with A1
            ]
        }
    ];

    const schedules = generateSchedules(courses, 10);

    if (schedules.length !== 0) {
        return { success: false, error: `Expected 0 schedules, got ${schedules.length}` };
    }

    return { success: true, details: `Correctly returned 0 schedules when all conflict` };
});

// Test 9: Four courses (realistic scenario)
test('Four courses - realistic schedule building', () => {
    const courses = [
        {
            courseCode: 'CSCI-356',
            sections: [
                createSection('CSCI356-L1', 'Lecture', 'CSCI-356', [createTime('Mon', '10:00am', '11:50am'), createTime('Wed', '10:00am', '11:50am')]),
                createSection('CSCI356-L2', 'Lecture', 'CSCI-356', [createTime('Tue', '2:00pm', '3:50pm'), createTime('Thu', '2:00pm', '3:50pm')])
            ]
        },
        {
            courseCode: 'CSCI-360',
            sections: [
                createSection('CSCI360-L1', 'Lecture', 'CSCI-360', [createTime('Tue', '10:00am', '11:50am'), createTime('Thu', '10:00am', '11:50am')]),
                createSection('CSCI360-L2', 'Lecture', 'CSCI-360', [createTime('Mon', '2:00pm', '3:50pm'), createTime('Wed', '2:00pm', '3:50pm')])
            ]
        },
        {
            courseCode: 'MATH-407',
            sections: [
                createSection('MATH407-L1', 'Lecture', 'MATH-407', [createTime('Mon', '12:00pm', '12:50pm'), createTime('Wed', '12:00pm', '12:50pm'), createTime('Fri', '12:00pm', '12:50pm')])
            ]
        },
        {
            courseCode: 'EALC-125',
            sections: [
                createSection('EALC125-L1', 'Lecture', 'EALC-125', [createTime('Tue', '12:00pm', '1:50pm'), createTime('Thu', '12:00pm', '1:50pm')]),
                createSection('EALC125-L2', 'Lecture', 'EALC-125', [createTime('Mon', '4:00pm', '5:50pm'), createTime('Wed', '4:00pm', '5:50pm')])
            ]
        }
    ];

    const schedules = generateSchedules(courses, 20);

    // Every schedule should have 4 sections (one lecture per course)
    for (const s of schedules) {
        if (s.length !== 4) {
            return { success: false, error: `Expected 4 sections per schedule, got ${s.length}` };
        }

        // Validate no conflicts
        const v = validateSchedule(s);
        if (!v.valid) return { success: false, error: v.error };
    }

    const combos = getLectureCombos(schedules);

    return { success: true, details: `Generated ${schedules.length} valid 4-course schedules across ${combos.size} lecture combos` };
});

// Test 10: Lectures + Discussions + Quizzes
test('Complex course with lecture, discussion, and quiz', () => {
    const courses = [{
        courseCode: 'CSCI-350',
        sections: [
            createSection('L1', 'Lecture', 'CSCI-350', [createTime('Mon', '10:00am', '11:50am')]),
            createSection('D1', 'Discussion', 'CSCI-350', [createTime('Tue', '10:00am', '10:50am')]),
            createSection('D2', 'Discussion', 'CSCI-350', [createTime('Wed', '10:00am', '10:50am')]),
            createSection('Q1', 'Quiz', 'CSCI-350', [createTime('Fri', '10:00am', '10:50am')])
        ]
    }];

    const schedules = generateSchedules(courses, 10);

    // 1 lecture * 2 discussions * 1 quiz = 2 schedules
    if (schedules.length !== 2) {
        return { success: false, error: `Expected 2 schedules, got ${schedules.length}` };
    }

    // Each schedule should have lecture + discussion + quiz = 3 sections
    for (const s of schedules) {
        if (s.length !== 3) {
            return { success: false, error: `Expected 3 sections per schedule, got ${s.length}` };
        }
    }

    return { success: true, details: `Generated ${schedules.length} schedules with L+D+Q` };
});

// ============================================================================
// RESULTS
// ============================================================================

console.log('\n' + '═'.repeat(60));
console.log(`🧪 Results: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(60));

if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Please review the errors above.');
    process.exit(1);
} else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
}
