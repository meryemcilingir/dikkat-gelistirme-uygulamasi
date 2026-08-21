import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { BehaviorSubject, map, filter, shareReplay } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ActivityService {
    private router = inject(Router);

    // Ordered list of activity paths from app.routes.ts
    private readonly activityPaths = [
        // Q1-50
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
        // Q51-100 (eski Q101-150)
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
        // Q101-150 (eski Q51-100)
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

    private currentPath$ = new BehaviorSubject<string>('');

    constructor() {
        this.router.events.pipe(
            filter(event => event instanceof NavigationEnd)
        ).subscribe((event: any) => {
            const path = event.urlAfterRedirects.split('/').pop() || '';
            this.currentPath$.next(path);
        });

        // Initial value
        const initialPath = this.router.url.split('/').pop() || '';
        this.currentPath$.next(initialPath);
    }

    readonly totalActivities = this.activityPaths.length;

    readonly currentIndex$ = this.currentPath$.pipe(
        map(path => {
            const index = this.activityPaths.indexOf(path);
            return index !== -1 ? index : 0;
        }),
        shareReplay(1)
    );

    readonly progress$ = this.currentIndex$.pipe(
        map(index => ((index + 1) / this.totalActivities) * 100),
        shareReplay(1)
    );

    readonly questionNumber$ = this.currentIndex$.pipe(
        map(index => index + 1),
        shareReplay(1)
    );

    next(): void {
        const currentPath = this.currentPath$.value;
        const index = this.activityPaths.indexOf(currentPath);
        if (index !== -1 && index < this.activityPaths.length - 1) {
            this.router.navigate([`/${this.activityPaths[index + 1]}`]);
        } else if (index === this.activityPaths.length - 1) {
            this.router.navigate(['/end']);
        }
    }

    prev(): void {
        const currentPath = this.currentPath$.value;
        const index = this.activityPaths.indexOf(currentPath);
        if (index > 0) {
            this.router.navigate([`/${this.activityPaths[index - 1]}`]);
        } else {
            this.router.navigate(['/']);
        }
    }
}
