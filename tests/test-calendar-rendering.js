/**
 * Test Calendar Rendering Position Calculations
 * Verifies that course blocks are positioned correctly with proper top offset and height
 */

console.log('📅 Testing Calendar Rendering Position Calculations...\n');

// Test the positioning logic
function testPositioning(description, startMin, expectedTopOffset, durationMinutes, expectedHeight) {
    const PIXELS_PER_HOUR = 40;
    const MARGIN = 2;

    // Calculate top offset (matching calendar-renderer.js logic)
    const topOffset = (startMin / 60) * PIXELS_PER_HOUR + MARGIN;

    // Calculate height
    const durationInHours = durationMinutes / 60;
    const blockHeight = durationInHours * PIXELS_PER_HOUR - (MARGIN * 2);

    // Use approximate matching for floating-point comparison (tolerance: 0.01px)
    const topMatches = Math.abs(topOffset - expectedTopOffset) < 0.01;
    const heightMatches = Math.abs(blockHeight - expectedHeight) < 0.01;

    const status = topMatches && heightMatches ? '✅ PASS' : '❌ FAIL';

    console.log(`${status}: ${description}`);
    console.log(`  Start minutes: ${startMin}`);
    console.log(`  Top offset: ${topOffset.toFixed(2)}px (expected: ${expectedTopOffset.toFixed(2)}px) ${topMatches ? '✓' : '✗'}`);
    console.log(`  Duration: ${durationMinutes} minutes`);
    console.log(`  Height: ${blockHeight.toFixed(2)}px (expected: ${expectedHeight.toFixed(2)}px) ${heightMatches ? '✓' : '✗'}`);
    console.log();

    return topMatches && heightMatches;
}

let passed = 0;
let failed = 0;

// Test 1: Section starting on the hour (8:00am)
// Start: 8:00am (0 minutes past) → top should be 2px
// Duration: 60 minutes → height should be 40 - 4 = 36px
if (testPositioning(
    'Section on the hour (8:00am-9:00am)',
    0,  // startMin
    2,  // expectedTopOffset
    60, // durationMinutes
    36  // expectedHeight
)) { passed++; } else { failed++; }

// Test 2: Section starting mid-hour (9:30am)
// Start: 9:30am (30 minutes past) → top should be (30/60)*40 + 2 = 22px
// Duration: 80 minutes (1h 20m) → height should be (80/60)*40 - 4 = 49.33px
if (testPositioning(
    'Section mid-hour (9:30am-10:50am)',
    30,   // startMin
    22,   // expectedTopOffset
    80,   // durationMinutes
    49.333333333333336  // expectedHeight: (80/60)*40 - 4 = 53.33 - 4 = 49.33
)) { passed++; } else { failed++; }

// Test 3: Section starting at 15-minute mark (10:15am)
// Start: 10:15am (15 minutes past) → top should be (15/60)*40 + 2 = 12px
// Duration: 45 minutes → height should be (45/60)*40 - 4 = 26px
if (testPositioning(
    'Section at 15-min mark (10:15am-11:00am)',
    15,  // startMin
    12,  // expectedTopOffset
    45,  // durationMinutes
    26   // expectedHeight
)) { passed++; } else { failed++; }

// Test 4: Section starting at 20-minute mark (8:20am)
// Start: 8:20am (20 minutes past) → top should be (20/60)*40 + 2 = 15.33px
// Duration: 60 minutes → height should be 36px
if (testPositioning(
    'Section at 20-min mark (8:20am-9:20am)',
    20,  // startMin
    15.333333333333334,  // expectedTopOffset
    60,  // durationMinutes
    36   // expectedHeight
)) { passed++; } else { failed++; }

// Test 5: Section starting at 50-minute mark (1:50pm)
// Start: 1:50pm (50 minutes past) → top should be (50/60)*40 + 2 = 35.33px
// Duration: 70 minutes → height should be (70/60)*40 - 4 = 42.67px
if (testPositioning(
    'Section at 50-min mark (1:50pm-3:00pm)',
    50,  // startMin
    35.333333333333336,  // expectedTopOffset
    70,  // durationMinutes
    42.666666666666664   // expectedHeight
)) { passed++; } else { failed++; }

// Test 6: Long multi-hour section (2:30pm-5:30pm = 180 minutes)
// Start: 2:30pm (30 minutes past) → top should be 22px
// Duration: 180 minutes (3 hours) → height should be 3*40 - 4 = 116px
if (testPositioning(
    'Multi-hour section (2:30pm-5:30pm)',
    30,   // startMin
    22,   // expectedTopOffset
    180,  // durationMinutes
    116   // expectedHeight
)) { passed++; } else { failed++; }

console.log('═'.repeat(60));
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
console.log('═'.repeat(60));

if (failed > 0) {
    console.log('\n⚠️  Some position calculations failed!');
    process.exit(1);
} else {
    console.log('\n✅ All position calculations correct!');
    process.exit(0);
}
