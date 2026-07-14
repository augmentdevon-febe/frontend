import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Match } from '../models/match.model';
import { buildApiUrl } from './api-url';

@Injectable({
  providedIn: 'root'
})
export class MatchesService {
  private readonly matchesUrl = buildApiUrl('/api/matches');

  constructor(private readonly http: HttpClient) {}

  getMatches(): Observable<Match[]> {
    return this.http.get<Match[]>(this.matchesUrl, {
      withCredentials: true
    });
  }
}
