import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LetterSequence } from './letter-sequence';

describe('LetterSequence', () => {
  let component: LetterSequence;
  let fixture: ComponentFixture<LetterSequence>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LetterSequence]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LetterSequence);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
