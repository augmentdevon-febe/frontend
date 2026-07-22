import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Match } from '../models/match.model';
import { MatchListRequest } from '../models/match-list-request.model';
import { buildApiUrl } from './api-url';
import { MatchesService } from './matches.service';

describe('MatchesService', () => {
  let service: MatchesService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MatchesService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(MatchesService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('posts to /api/matches with identifier body and credentials', () => {
    const requestBody: MatchListRequest = {
      identifier: 'liga_mx_invierno_2026'
    };
    const expectedResponse: Match[] = [
      {
        identifier: 'liga_mx_invierno_2026',
        homeTeam: 'Club America',
        awayTeam: 'Monterrey',
        matchStage: 'Quarterfinal',
        venue: 'Azteca',
        matchDate: '2099-07-20T19:00:00Z'
      }
    ];

    service.getMatches(requestBody).subscribe((matches) => {
      expect(matches).toEqual(expectedResponse);
    });

    const req = httpMock.expectOne(buildApiUrl('/api/matches'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(requestBody);
    expect(req.request.withCredentials).toBe(true);

    req.flush(expectedResponse);
  });
});
