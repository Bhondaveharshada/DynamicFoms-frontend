import { TestBed } from '@angular/core/testing';

import { TimepointService } from './timepoint.service';

describe('TimepointService', () => {
  let service: TimepointService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TimepointService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
