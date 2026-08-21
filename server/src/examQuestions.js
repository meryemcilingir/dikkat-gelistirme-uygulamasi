// Sabit 150 soruluk sınav sırası.
// Kaynak: src/app/core/services/activity.service.ts (activityPaths) ile birebir aynı sırada olmalı.
// Angular tarafındaki karşılığı: src/app/core/models/exam-questions.ts
const EXAM_QUESTIONS = [
    'pattern', 'odd-direction', 'shade-sorting', 'number-sequence', 'symbol-matching',
    'multi-condition-selection', 'animal-position', 'pattern-2', 'shape-coloring',
    'liquid-selection', 'longest-rope', 'letter-matching', 'shape-pattern',
    'board-letter-matching', 'shape-to-color-match', 'sequence-rule-breaker',
    'living-things', 'traffic-sign-matching', 'abacus-counting', 'dot-pattern-drawing',
    'fruit-count-matching', 'find-most-balls', 'shadow-matching', 'letter-sequence',
    'identical-pattern', 'match-size', 'grid-coloring', 'find-same-symbols',
    'find-numbers', 'find-reversed-e', 'count-and-add', 'rhythmic-counting',
    'top-view', 'box-coloring', 'triangle-size', 'flower-coloring', 'not-in-word',
    'finding-green-lines', 'incorrect-numbers', 'water-capacity', 'fruit-size-ranking',
    'elderly-people', 'find-different', 'cylinder-selection', 'pattern-completion',
    'shape-counting', 'happy-children', 'different-mountain', 'letter-grid',
    'ice-cream-shape',
    'most-colorful-ball', 'cat-position', 'dot-grid-copy', 'bike-matching', 'pencil-matching',
    'symbol-grid-copy', 'ball-matching', 'orange-different', 'river-branches', 'symbol-grid-matching',
    'shape-match-find', 'count-apples', 'ball-sequence', 'snake-letter', 'letter-color-match',
    'fruit-subtraction', 'triangle-match', 'set-match', 'profession-matching', 'fruit-basket',
    'flower-order', 'symbol-color-match', 'object-addition', 'symbol-block-match', 'shade-sorting-2',
    'balance-scale', 'two-feature-filter', 'subtle-difference', 'letter-hunt', 'missing-number',
    'odd-category-out', 'mirror-letter', 'letter-count', 'first-letter-match', 'count-difference',
    'number-ordering', 'rotate-shape', 'count-sides', 'sort-by-size', 'same-word-find',
    'count-given-color', 'star-difference', 'fruit-sequence', 'arrow-grid-copy', 'color-pattern-completion',
    'number-grid-match', 'digit-row-finder', 'number-color-match', 'symbol-sequence-match', 'shape-matrix',
    'school-profession', 'tallest-animal', 'shape-corners',
    'pencil-matching-v2', 'shape-count-coloring', 'sport-matching', 'letter-counting',
    'elephant-direction', 'symbol-addition', 'grid-coloring-numbers',
    'child-bicycle-matching', 'symbol-pair-matching', 'house-door-direction', 'count-matching-v2',
    'rectangle-selection', 'count-six-selection', 'electric-appliance-selection',
    'pattern-3', 'zebra-letters', 'shape-matching-drawn',
    'watermelon-math', 'fruit-sequence-v2',
    'doctor-suitability', 'fruit-group-matching',
    'orange-coloring',
    'symbol-grid-counting', 'object-count-selection', 'fewest-triangles',
    'favorite-activity', 'count-matching-v3', 'egg-subtraction',
    'house-items', 'pink-grid', 'letter-counting-v2', 'shape-count-coloring-v2', 'sad-expressions', 'geometric-sequence',
    'finding-red-lines', 'uppercase-lowercase', 'word-shape-matching',
    'pattern-transfer', 'ladybug-spots', 'rotate-grid', 'color-by-number',
    'toothbrush-selection', 'symbol-addition-v2', 'cat-sequence',
    'missing-number-grid', 'veg-grid-transfer', 'symbol-sequence-placement',
];

if (EXAM_QUESTIONS.length !== 150) {
    throw new Error(`EXAM_QUESTIONS 150 olmalı, şu an: ${EXAM_QUESTIONS.length}`);
}

module.exports = { EXAM_QUESTIONS };
