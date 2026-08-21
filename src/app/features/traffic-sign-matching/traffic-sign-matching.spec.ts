import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrafficSignMatchingComponent } from './traffic-sign-matching.component';

describe('TrafficSignMatchingComponent', () => {
  let component: TrafficSignMatchingComponent;
  let fixture: ComponentFixture<TrafficSignMatchingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrafficSignMatchingComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(TrafficSignMatchingComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
