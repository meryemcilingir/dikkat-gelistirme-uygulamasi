import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TriangleSizeComponent } from './triangle-size.component';

describe('TriangleSizeComponent', () => {
  let component: TriangleSizeComponent;
  let fixture: ComponentFixture<TriangleSizeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TriangleSizeComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(TriangleSizeComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
