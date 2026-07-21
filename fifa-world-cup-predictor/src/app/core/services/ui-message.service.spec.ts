import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { UiMessageService } from './ui-message.service';

describe('UiMessageService', () => {
  let service: UiMessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UiMessageService);
  });

  it('maps login auth errors to the required-login message', () => {
    const message401 = service.mapLoginSessionCheckError(new HttpErrorResponse({ status: 401 }));
    const message403 = service.mapLoginSessionCheckError(new HttpErrorResponse({ status: 403 }));

    expect(message401).toBe(service.messages.login.required);
    expect(message403).toBe(service.messages.login.required);
  });

  it('maps network error to temporary-session-failure message', () => {
    const message = service.mapLoginSessionCheckError(new HttpErrorResponse({ status: 0 }));

    expect(message).toBe(service.messages.login.temporarySessionFailure);
  });

  it('maps unknown errors to generic session-check-failed message', () => {
    const message = service.mapLoginSessionCheckError(new Error('boom'));

    expect(message).toBe(service.messages.login.sessionCheckFailed);
  });

  it('returns prediction error set with expected messages', () => {
    const set = service.predictionErrorSet();

    expect(set.sessionExpired).toBe(service.messages.prediction.sessionExpired);
    expect(set.predictionFailed).toBe(service.messages.prediction.predictionFailed);
    expect(set.unexpectedError).toBe(service.messages.prediction.unexpectedError);
  });
});
