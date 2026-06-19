import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Match } from '../models/match.model';
import { PredictionRequest } from '../models/prediction-request.model';
import { PredictionResponse } from '../models/prediction-response.model';

@Injectable({
  providedIn: 'root'
})
export class PredictionService {
  private readonly predictionUrl = '/api/predictions';

  constructor(private readonly http: HttpClient) {}

  predict(match: Match): Observable<PredictionResponse> {
    const requestBody: PredictionRequest = {
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      matchStage: match.matchStage,
      venue: match.venue,
      matchDate: match.matchDate
    };

    return this.http.post<PredictionResponse>(this.predictionUrl, requestBody, {
      withCredentials: true
    });
  }
}
