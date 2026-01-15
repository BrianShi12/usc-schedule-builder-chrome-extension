/**
 * USC Schedule Builder - Schedule Generator (FIXED)
 * 
 * Generates all valid schedule combinations using backtracking algorithm
 */

// DEBUG declaration removed - inherits from time-parser.js
debugLog('📅 Schedule Generator module loaded');

/**
 * Generate valid schedules from course data
 * Uses round-robin approach: generates diverse schedules by cycling through lecture combinations
 */
function generateSchedules(coursesData, maxSchedules = 20) {
    debugLog('🔄 Starting schedule generation');
    debugLog(`Courses to schedule: ${coursesData.length}`);
    debugLog(`Max schedules requested: ${maxSchedules}`);

    // Group sections by course and type
    const coursesSections = groupSectionsByType(coursesData);

    if (coursesSections.length === 0) {
        console.warn('No course sections to schedule');
        return [];
    }

    logRequiredSections(coursesSections);

    // Step 1: Generate ALL valid schedules (with a reasonable cap to avoid infinite loops)
    const allSchedules = [];
    const seenSchedules = new Set();
    const absoluteMax = 500; // Safety cap to prevent performance issues

    debugLog(`📈 Generating all valid schedules (up to ${absoluteMax} for performance)...`);

    generateAllSchedules(coursesSections, 0, [], allSchedules, seenSchedules, absoluteMax);

    debugLog(`📊 Found ${allSchedules.length} total valid schedules`);

    if (allSchedules.length === 0) {
        return [];
    }

    // Step 2: Group schedules by lecture combination
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
    debugLog(`� Found ${lectureComboKeys.length} unique lecture combinations`);

    // Shuffle within each combo for variety
    for (const key of lectureComboKeys) {
        schedulesByLectureCombo[key].sort(() => Math.random() - 0.5);
    }

    // Shuffle the order of lecture combos for variety
    lectureComboKeys.sort(() => Math.random() - 0.5);

    // Step 3: Round-robin selection until maxSchedules reached
    const finalSchedules = [];
    const comboIndices = {}; // Track current index for each combo

    for (const key of lectureComboKeys) {
        comboIndices[key] = 0;
    }

    let pass = 0;
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

        pass++;

        // If we couldn't add any schedules this pass, we've exhausted all options
        if (!addedThisPass) {
            debugLog(`📊 Exhausted all schedules after ${pass} passes`);
            break;
        }
    }

    debugLog(`✅ Generated ${finalSchedules.length} diverse schedules (requested: ${maxSchedules})`);
    debugLog(`📊 Distribution across ${lectureComboKeys.length} lecture combos`);

    return finalSchedules;
}

/**
 * Group sections by course and type
 */
function groupSectionsByType(coursesData) {
    return coursesData.map(course => {
        const sections = {
            courseCode: course.courseCode,
            courseTitle: course.courseTitle,
            linkingPattern: course.linkingPattern || 'GROUPED',  // NEW: Store linking pattern
            lectures: [],
            discussions: [],
            quizzes: [],
            labs: []
        };

        course.sections.forEach(section => {
            // Add courseCode to section for calendar rendering
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

        // BUGFIX: Shuffle sections to ensure random sampling across the entire set
        // Without shuffling, when maxVariantsPerCombo=1, we only get the first 20 lectures
        // which might all be at similar times (e.g., all morning classes)
        // With shuffling, we get a diverse time distribution
        sections.lectures = shuffleArray(sections.lectures);
        sections.discussions = shuffleArray(sections.discussions);
        sections.quizzes = shuffleArray(sections.quizzes);
        sections.labs = shuffleArray(sections.labs);

        return sections;
    });
}

/**
 * Fisher-Yates shuffle for array randomization
 * Ensures even distribution when sampling subsets
 */
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

/**
 * Log required sections for debugging
 */
function logRequiredSections(coursesSections) {
    coursesSections.forEach(course => {
        debugLog(`\n${course.courseCode}:`);
        debugLog(`  - ${course.lectures.length} lecture(s)`);
        debugLog(`  - ${course.discussions.length} discussion(s)`);
        debugLog(`  - ${course.quizzes.length} quiz(zes)`);
        debugLog(`  - ${course.labs.length} lab(s)`);
    });
}

/**
 * Count how many valid (non-conflicting) lecture combinations exist
 * This helps us adaptively decide how many schedule variants to generate
 */
function countValidLectureCombinations(courses) {
    let count = 0;

    function countLectures(courseIndex, currentLectures) {
        // Base case: processed all courses
        if (courseIndex >= courses.length) {
            count++;
            return;
        }

        const course = courses[courseIndex];

        // Must have lectures
        if (course.lectures.length === 0) {
            return;
        }

        // Try each lecture
        for (const lecture of course.lectures) {
            // Check if this lecture conflicts with already selected lectures
            if (!hasConflict(lecture, currentLectures)) {
                currentLectures.push(lecture);
                countLectures(courseIndex + 1, currentLectures);
                currentLectures.pop();
            }
        }
    }

    countLectures(0, []);
    return count;
}

/**
 * Generate all valid schedules up to absoluteMax
 * Simple backtracking without any per-combo limits
 */
function generateAllSchedules(courses, courseIndex, currentSchedule, allSchedules, seenSchedules, absoluteMax) {
    // Stop if we've hit the safety cap
    if (allSchedules.length >= absoluteMax) {
        return;
    }

    // Base case: processed all courses - we have a valid schedule!
    if (courseIndex >= courses.length) {
        const scheduleKey = currentSchedule.map(s => s.sectionId).sort().join(',');

        if (!seenSchedules.has(scheduleKey)) {
            seenSchedules.add(scheduleKey);
            allSchedules.push([...currentSchedule]);
        }
        return;
    }

    const course = courses[courseIndex];

    // Must have at least one lecture
    if (course.lectures.length === 0) {
        console.warn(`❌ ${course.courseCode} has no lectures, skipping`);
        return;
    }

    // Shuffle lectures for variety
    const shuffledLectures = [...course.lectures].sort(() => Math.random() - 0.5);

    // Try each lecture
    for (const lecture of shuffledLectures) {
        if (allSchedules.length >= absoluteMax) return;

        if (hasConflict(lecture, currentSchedule)) {
            continue;
        }

        currentSchedule.push(lecture);

        // Try all section combinations for this lecture
        tryAllSections(course, currentSchedule, courses, courseIndex, allSchedules, seenSchedules, absoluteMax);

        currentSchedule.pop();
    }
}

/**
 * Try all combinations of discussions, quizzes, and labs for the current course
 */
function tryAllSections(course, currentSchedule, courses, courseIndex, allSchedules, seenSchedules, absoluteMax) {
    // Get the chosen lecture for linking
    const chosenLecture = currentSchedule.find(s =>
        s.courseCode === course.courseCode && s.type.toLowerCase().includes('lec')
    );

    // Filter discussions based on linking pattern
    let validDiscussions = [...course.discussions];
    if (course.linkingPattern === 'INTERLEAVED' && chosenLecture) {
        validDiscussions = course.discussions.filter(d =>
            d.parentLectureId === chosenLecture.sectionId
        );
    }

    // Shuffle sections for variety
    const shuffledDiscussions = validDiscussions.sort(() => Math.random() - 0.5);
    const shuffledQuizzes = [...course.quizzes].sort(() => Math.random() - 0.5);
    const shuffledLabs = [...course.labs].sort(() => Math.random() - 0.5);

    // Only include null if there are NO sections of that type
    const discussionChoices = shuffledDiscussions.length > 0 ? shuffledDiscussions : [null];
    const quizChoices = shuffledQuizzes.length > 0 ? shuffledQuizzes : [null];
    const labChoices = shuffledLabs.length > 0 ? shuffledLabs : [null];

    // Try all combinations
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

                // Move to next course
                generateAllSchedules(courses, courseIndex + 1, currentSchedule, allSchedules, seenSchedules, absoluteMax);

                if (lab) currentSchedule.pop();
            }

            if (quiz) currentSchedule.pop();
        }

        if (discussion) currentSchedule.pop();
    }
}

/**
 * Backtracking algorithm with diversity prioritization
 */
function backtrackWithDiversity(courses, courseIndex, currentSchedule, validSchedules, seenSchedules, lectureComboCount, maxSchedules, maxVariantsPerCombo) {
    // Stop if we've reached max schedules
    if (validSchedules.length >= maxSchedules) {
        return;
    }

    // Base case: processed all courses - we have a valid schedule!
    if (courseIndex >= courses.length) {
        const scheduleKey = currentSchedule.map(s => s.sectionId).sort().join(',');

        if (!seenSchedules.has(scheduleKey)) {
            // Check lecture combo diversity
            const lectureComboKey = currentSchedule
                .filter(s => s.type.toLowerCase().includes('lec'))
                .map(s => s.sectionId)
                .sort()
                .join(',');

            // Limit to adaptive max schedules per unique lecture combination
            if (!lectureComboCount[lectureComboKey]) {
                lectureComboCount[lectureComboKey] = 0;
            }

            if (lectureComboCount[lectureComboKey] < maxVariantsPerCombo) {
                seenSchedules.add(scheduleKey);
                validSchedules.push([...currentSchedule]);
                lectureComboCount[lectureComboKey]++;
                debugLog(`✓ Found schedule #${validSchedules.length}`);
            }
        }
        return;
    }

    const course = courses[courseIndex];

    // Must have at least one lecture
    if (course.lectures.length === 0) {
        console.warn(`❌ ${course.courseCode} has no lectures, skipping`);
        return;
    }

    // Shuffle lectures for randomness to ensure variety
    const shuffledLectures = [...course.lectures].sort(() => Math.random() - 0.5);

    // Try each lecture
    for (const lecture of shuffledLectures) {
        if (hasConflict(lecture, currentSchedule)) {
            continue;
        }

        // Add lecture
        currentSchedule.push(lecture);

        // Now try combinations of discussions, quizzes, labs
        tryOtherSectionsWithDiversity(course, currentSchedule, courses, courseIndex, validSchedules, seenSchedules, lectureComboCount, maxSchedules, maxVariantsPerCombo);

        // Remove lecture (backtrack)
        currentSchedule.pop();

        if (validSchedules.length >= maxSchedules) {
            return;
        }
    }
}

/**
 * Try combinations of discussions, quizzes, and labs with diversity focus
 */
function tryOtherSectionsWithDiversity(course, currentSchedule, courses, courseIndex, validSchedules, seenSchedules, lectureComboCount, maxSchedules, maxVariantsPerCombo) {
    // Get the chosen lecture for this course (should be the last lecture added for this course)
    const chosenLecture = currentSchedule.find(s =>
        s.courseCode === course.courseCode && s.type.toLowerCase().includes('lec')
    );

    // Filter discussions based on linking pattern
    let validDiscussions = [...course.discussions];
    if (course.linkingPattern === 'INTERLEAVED' && chosenLecture) {
        // Only allow discussions that belong to the chosen lecture
        validDiscussions = course.discussions.filter(d =>
            d.parentLectureId === chosenLecture.sectionId
        );
        debugLog(`  🔗 INTERLEAVED: Filtered to ${validDiscussions.length} discussions for lecture ${chosenLecture.sectionId}`);
    }

    // Shuffle sections for randomness
    const shuffledDiscussions = validDiscussions.sort(() => Math.random() - 0.5);
    const shuffledQuizzes = [...course.quizzes].sort(() => Math.random() - 0.5);
    const shuffledLabs = [...course.labs].sort(() => Math.random() - 0.5);

    // IMPORTANT: Only include null if there are NO sections of that type
    // If sections exist, one MUST be chosen (required component)
    const discussionChoices = shuffledDiscussions.length > 0 ? shuffledDiscussions : [null];
    const quizChoices = shuffledQuizzes.length > 0 ? shuffledQuizzes : [null];
    const labChoices = shuffledLabs.length > 0 ? shuffledLabs : [null];

    let foundForThisLecture = 0;

    // Try combinations (limit based on adaptive maxVariantsPerCombo)
    for (const discussion of discussionChoices) {
        if (foundForThisLecture >= maxVariantsPerCombo) break;
        if (discussion && hasConflict(discussion, currentSchedule)) continue;

        if (discussion) currentSchedule.push(discussion);

        for (const quiz of quizChoices) {
            if (foundForThisLecture >= maxVariantsPerCombo) break;
            if (quiz && hasConflict(quiz, currentSchedule)) continue;

            if (quiz) currentSchedule.push(quiz);

            for (const lab of labChoices) {
                if (foundForThisLecture >= maxVariantsPerCombo) break;
                if (lab && hasConflict(lab, currentSchedule)) continue;

                if (lab) currentSchedule.push(lab);

                const beforeCount = validSchedules.length;

                // Sections for this course complete - move to next course
                backtrackWithDiversity(courses, courseIndex + 1, currentSchedule, validSchedules, seenSchedules, lectureComboCount, maxSchedules, maxVariantsPerCombo);

                if (validSchedules.length > beforeCount) {
                    foundForThisLecture++;
                }

                if (lab) currentSchedule.pop();

                if (validSchedules.length >= maxSchedules || foundForThisLecture >= maxVariantsPerCombo) {
                    if (quiz) currentSchedule.pop();
                    if (discussion) currentSchedule.pop();
                    return;
                }
            }

            if (quiz) currentSchedule.pop();
        }

        if (discussion) currentSchedule.pop();
    }
}

/**
 * Check if a section conflicts with any section in the schedule
 */
function hasConflict(section, schedule) {
    if (!window.ScheduleBuilder || !window.ScheduleBuilder.hasTimeConflict) {
        console.error('Time parser not loaded!');
        return false;
    }

    for (const existing of schedule) {
        if (window.ScheduleBuilder.hasTimeConflict(section, existing)) {
            return true;
        }
    }
    return false;
}

// Export function
window.ScheduleBuilder = window.ScheduleBuilder || {};
window.ScheduleBuilder.generateSchedules = generateSchedules;
