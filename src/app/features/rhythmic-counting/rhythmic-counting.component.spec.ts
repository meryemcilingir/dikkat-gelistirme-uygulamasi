import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RhythmicCounting } from './rhythmic-counting';

describe('RhythmicCounting', () => {
  let component: RhythmicCounting;
  let fixture: ComponentFixture<RhythmicCounting>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RhythmicCounting]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RhythmicCounting);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
