import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Match } from '../models/match.model';
import { MatchListRequest } from '../models/match-list-request.model';
import { buildApiUrl } from './api-url';

@Injectable({
  providedIn: 'root'
})
export class MatchesService {
  private readonly matchesUrl = buildApiUrl('/api/matches');

  constructor(private readonly http: HttpClient) {}

  getMatches(request: MatchListRequest): Observable<Match[]> {
    return this.http.post<Match[]>(this.matchesUrl, request, {
      withCredentials: true
    });
  }
}
