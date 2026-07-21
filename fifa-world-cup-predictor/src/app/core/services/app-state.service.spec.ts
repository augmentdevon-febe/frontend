import { TestBed } from '@angular/core/testing';
import { Match } from '../models/match.model';
import { PredictionResponse } from '../models/prediction-response.model';
import { AppStateService } from './app-state.service';

describe('AppStateService', () => {
  let service: AppStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AppStateService);
  });

  it('stores and exposes shared prediction/auth state through signals', () => {
    const match: Match = {
      homeTeam: 'Mexico',
      awayTeam: 'Brazil',
      matchStage: 'Group Stage',
      venue: 'Test',
      matchDate: '2099-01-01T00:00:00.000Z'
    };

    const prediction: PredictionResponse = {
      homeTeam: 'Mexico',
      awayTeam: 'Brazil',
      predictedScore: '2-1',
      result: 'HOME_WIN',
      explanation: 'test'
    };

    service.setMatches([match]);
    service.setPrediction(prediction);
    service.setIsAuthenticated(true);
    service.setIsPredicting(true);
    service.setAuthStatusMessage('ok');

    expect(service.matchesSig()).toEqual([match]);
    expect(service.predictionSig()).toEqual(prediction);
    expect(service.isAuthenticatedSig()).toBe(true);
    expect(service.isPredictingSig()).toBe(true);
    expect(service.authStatusMessageSig()).toBe('ok');
  });

  it('tracks login shared state', () => {
    service.setIsCheckingSession(true);
    service.setIsLoginInProgress(true);
    service.setLoginError('error');

    expect(service.isCheckingSessionSig()).toBe(true);
    expect(service.isLoginInProgressSig()).toBe(true);
    expect(service.loginErrorSig()).toBe('error');
  });
});
