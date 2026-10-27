import { TestBed } from '@angular/core/testing';
import { StatusBadgeComponent } from './status-badge.component';

describe('StatusBadgeComponent', () => {
  it('renders the human label', () => {
    const f = TestBed.createComponent(StatusBadgeComponent);
    f.componentRef.setInput('status', 'waiting_for_parts');
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Waiting for Parts');
  });
});
