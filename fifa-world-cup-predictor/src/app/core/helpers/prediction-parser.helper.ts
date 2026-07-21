import { HttpErrorResponse } from '@angular/common/http';
import { PredictionResponse } from '../models/prediction-response.model';

export interface PredictionErrorMessages {
  sessionExpired: string;
  predictionFailed: string;
  unexpectedError: string;
}

export function getProjectedWinner(prediction: PredictionResponse | null): string {
  if (!prediction) {
    return 'TBD';
  }

  const result = (prediction.result || '').toLowerCase();
  const homeTeam = prediction.homeTeam;
  const awayTeam = prediction.awayTeam;

  if (result.includes('draw')) {
    return 'Draw';
  }

  if (result.includes(homeTeam.toLowerCase()) || result.includes('home')) {
    return homeTeam;
  }

  if (result.includes(awayTeam.toLowerCase()) || result.includes('away')) {
    return awayTeam;
  }

  return homeTeam;
}

export function formatPredictionResultLabel(prediction: PredictionResponse): string {
  const normalizedResult = (prediction.result || '').trim().toUpperCase();

  if (normalizedResult === 'HOME_WIN') {
    return prediction.homeTeam + ' Win';
  }

  if (normalizedResult === 'AWAY_WIN') {
    return prediction.awayTeam + ' Win';
  }

  if (normalizedResult === 'DRAW') {
    return 'DRAW';
  }

  return prediction.result;
}

export function mapPredictionErrorMessage(
  error: unknown,
  messages: PredictionErrorMessages
): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 401 || error.status === 403) {
      return messages.sessionExpired;
    }

    return messages.predictionFailed;
  }

  return messages.unexpectedError;
}
