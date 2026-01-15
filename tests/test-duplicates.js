/**
 * Duplicate Detection Test
 * Verifies that the round-robin algorithm does not produce duplicate schedules
 */

console.log('🔍 Testing for Duplicate Schedules...\n');

// Mock functions (same as test-schedule-generator.js)
const DEBUG = false;
function debugLog(...args) {
    if (DEBUG) console.log(...args);
}

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

// Helper to create schedule key
function getScheduleKey(schedule) {
    return schedule.map(s => s.sectionId).sort().join(',');
}

// Test with various scenarios
let testsPassed = 0;
let testsFailed = 0;

function testForDuplicates(name, courses, maxSchedules) {
    console.log(`\n🧪 Testing: ${name}`);

    const schedules = generateSchedules(courses, maxSchedules);
    const scheduleKeys = new Set();
    const duplicates = [];

    for (let i = 0; i < schedules.length; i++) {
        const key = getScheduleKey(schedules[i]);
        if (scheduleKeys.has(key)) {
            duplicates.push({ index: i, key });
        } else {
            scheduleKeys.add(key);
        }
    }

    if (duplicates.length > 0) {
        console.log(`❌ FAILED: Found ${duplicates.length} duplicate(s):`);
        duplicates.forEach(d => {
            console.log(`   Schedule ${d.index}: ${d.key}`);
        });
        testsFailed++;
        return false;
    } else {
        console.log(`✅ PASSED: ${schedules.length} schedules, all unique`);
        testsPassed++;
        return true;
    }
}

// Test 1: Simple case
testForDuplicates('Single course with 3 lectures', [
    {
        courseCode: 'TEST-101',
        sections: [
            createSection('L1', 'Lecture', 'TEST-101', [createTime('Mon', '9:00am', '9:50am')]),
            createSection('L2', 'Lecture', 'TEST-101', [createTime('Mon', '10:00am', '10:50am')]),
            createSection('L3', 'Lecture', 'TEST-101', [createTime('Mon', '11:00am', '11:50am')])
        ]
    }
], 10);

// Test 2: Two courses
testForDuplicates('Two courses with multiple sections', [
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
], 20);

// Test 3: Lecture + Discussion combinations
testForDuplicates('Course with lecture and discussions', [
    {
        courseCode: 'TEST-201',
        sections: [
            createSection('L1', 'Lecture', 'TEST-201', [createTime('Mon', '9:00am', '9:50am')]),
            createSection('L2', 'Lecture', 'TEST-201', [createTime('Mon', '10:00am', '10:50am')]),
            createSection('D1', 'Discussion', 'TEST-201', [createTime('Wed', '9:00am', '9:50am')]),
            createSection('D2', 'Discussion', 'TEST-201', [createTime('Wed', '10:00am', '10:50am')]),
            createSection('D3', 'Discussion', 'TEST-201', [createTime('Wed', '11:00am', '11:50am')])
        ]
    }
], 20);

// Test 4: Large number of schedules
testForDuplicates('Large schedule set (50 schedules)', [
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
], 50);

// Test 5: Complex case with multiple section types
testForDuplicates('Complex: Lecture + Discussion + Quiz', [
    {
        courseCode: 'COMPLEX-301',
        sections: [
            createSection('L1', 'Lecture', 'COMPLEX-301', [createTime('Mon', '9:00am', '9:50am')]),
            createSection('L2', 'Lecture', 'COMPLEX-301', [createTime('Mon', '10:00am', '10:50am')]),
            createSection('D1', 'Discussion', 'COMPLEX-301', [createTime('Wed', '9:00am', '9:50am')]),
            createSection('D2', 'Discussion', 'COMPLEX-301', [createTime('Wed', '10:00am', '10:50am')]),
            createSection('D3', 'Discussion', 'COMPLEX-301', [createTime('Wed', '11:00am', '11:50am')]),
            createSection('Q1', 'Quiz', 'COMPLEX-301', [createTime('Fri', '9:00am', '9:50am')]),
            createSection('Q2', 'Quiz', 'COMPLEX-301', [createTime('Fri', '10:00am', '10:50am')])
        ]
    }
], 30);

console.log('\n' + '═'.repeat(60));
console.log(`🔍 Duplicate Detection Results: ${testsPassed} passed, ${testsFailed} failed`);
console.log('═'.repeat(60));

if (testsFailed > 0) {
    console.log('\n⚠️  Duplicates detected! Algorithm needs fixing.');
    process.exit(1);
} else {
    console.log('\n✅ No duplicates found in any test case!');
    process.exit(0);
}
