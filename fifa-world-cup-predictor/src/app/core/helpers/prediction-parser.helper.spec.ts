import { HttpErrorResponse } from '@angular/common/http';
import { PredictionResponse } from '../models/prediction-response.model';
import {
  formatPredictionResultLabel,
  getProjectedWinner,
  mapPredictionErrorMessage
} from './prediction-parser.helper';

describe('prediction-parser.helper', () => {
  const basePrediction: PredictionResponse = {
    homeTeam: 'Mexico',
    awayTeam: 'Brazil',
    predictedScore: '2-1',
    result: 'HOME_WIN',
    explanation: 'home advantage'
  };

  it('returns TBD when there is no prediction yet', () => {
    expect(getProjectedWinner(null)).toBe('TBD');
  });

  it('extracts draw winner label from result text', () => {
    const prediction: PredictionResponse = {
      ...basePrediction,
      result: 'Draw after extra time'
    };

    expect(getProjectedWinner(prediction)).toBe('Draw');
  });

  it('formats known result codes for UI', () => {
    expect(formatPredictionResultLabel(basePrediction)).toBe('Mexico Win');
    expect(
      formatPredictionResultLabel({ ...basePrediction, result: 'AWAY_WIN' })
    ).toBe('Brazil Win');
    expect(formatPredictionResultLabel({ ...basePrediction, result: 'DRAW' })).toBe('DRAW');
  });

  it('falls back safely for unexpected result codes', () => {
    const prediction: PredictionResponse = {
      ...basePrediction,
      result: 'PENALTY_SHOOTOUT'
    };

    expect(getProjectedWinner(prediction)).toBe('Mexico');
    expect(formatPredictionResultLabel(prediction)).toBe('PENALTY_SHOOTOUT');
  });

  it('handles incomplete payload fields without throwing', () => {
    const partialPrediction = {
      homeTeam: 'Mexico',
      awayTeam: 'Brazil',
      predictedScore: '1-1',
      result: '',
      explanation: ''
    } as PredictionResponse;

    expect(() => getProjectedWinner(partialPrediction)).not.toThrow();
    expect(() => formatPredictionResultLabel(partialPrediction)).not.toThrow();
    expect(getProjectedWinner(partialPrediction)).toBe('Mexico');
    expect(formatPredictionResultLabel(partialPrediction)).toBe('');
  });

  it('maps 401/403 to session-expired message', () => {
    const message = mapPredictionErrorMessage(
      new HttpErrorResponse({ status: 401 }),
      {
        sessionExpired: 'session expired',
        predictionFailed: 'prediction failed',
        unexpectedError: 'unexpected'
      }
    );

    expect(message).toBe('session expired');
  });

  it('maps generic HTTP errors and non-HTTP errors properly', () => {
    const httpMessage = mapPredictionErrorMessage(
      new HttpErrorResponse({ status: 500 }),
      {
        sessionExpired: 'session expired',
        predictionFailed: 'prediction failed',
        unexpectedError: 'unexpected'
      }
    );

    const unknownMessage = mapPredictionErrorMessage(new Error('boom'), {
      sessionExpired: 'session expired',
      predictionFailed: 'prediction failed',
      unexpectedError: 'unexpected'
    });

    expect(httpMessage).toBe('prediction failed');
    expect(unknownMessage).toBe('unexpected');
  });
});
