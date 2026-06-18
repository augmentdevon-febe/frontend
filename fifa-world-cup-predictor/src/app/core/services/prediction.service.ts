import { HttpClient, HttpHeaders } from '@angular/common/http';
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
      matchStage: 'Group Stage',
      venue: '',
      matchDate: ''
    };

    const sessionCookie = document.cookie;

    // HttpOnly cookies cannot be read from JavaScript, so sessionCookie may be empty.
    // Browsers also restrict manually setting Cookie headers from frontend code.
    // withCredentials is the correct browser-based way to include cookies.
    // In local dev, Angular proxy forwards /api calls to backend to avoid browser CORS issues.
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Accept: 'application/json'
    });

    if (sessionCookie) {
      headers = headers.set('Cookie', sessionCookie);
    }

    return this.http.post<PredictionResponse>(this.predictionUrl, requestBody, {
      headers,
      withCredentials: true
    });
  }
}
