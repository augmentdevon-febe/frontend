import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription, finalize, timeout } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { Match } from '../../core/models/match.model';
import { PredictionResponse } from '../../core/models/prediction-response.model';
import { AuthService } from '../../core/services/auth.service';
import { MatchesService } from '../../core/services/matches.service';
import { PredictionService } from '../../core/services/prediction.service';

@Component({
  selector: 'app-prediction',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  templateUrl: './prediction.component.html',
  styleUrl: './prediction.component.css'
})
// Orchestrates match selection, prediction requests, and prediction result rendering.
export class PredictionComponent implements OnInit, OnDestroy {
  // Centralized user-facing messages used across prediction flow.
  readonly pageMessages = [
    'Checking your authentication status...',
    'No active authenticated session. Please log in again.',
    'Unable to verify session right now. You can still try predicting; backend auth will be enforced.',
    'Loading matches from backend...',
    'Unable to load World Cup matches right now. Please refresh and try again.',
    'No upcoming matches available right now. Please check back later.',
    'Please select a match before predicting.',
    'The selected match is invalid. Please choose another one.',
    'Your session expired or is not authenticated. Please log in again.',
    'Prediction request failed. Please try again in a moment.',
    'An unexpected error occurred while predicting the match.',
    'Running simulation...'
  ] as const;

  private readonly messageIndex = {
    checkingAuth: 0,
    noAuthSession: 1,
    sessionCheckFailed: 2,
    loadingMatches: 3,
    matchesLoadError: 4,
    noUpcomingMatches: 5,
    selectMatchError: 6,
    invalidMatchError: 7,
    sessionExpired: 8,
    predictionFailed: 9,
    unexpectedError: 10,
    runningSimulation: 11
  } as const;

  readonly predictionForm;
  private readonly ongoingMatchWindowMs = 3 * 60 * 60 * 1000;

  private readonly mexicoCityDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  });

  matches: Match[] = [];
  prediction: PredictionResponse | null = null;

  isLoadingMatches = true;
  isCheckingAuth = true;
  isPredicting = false;
  isAuthenticated = false;

  authStatusMessage = 'Checking your authentication status...';
  matchesError = '';
  formError = '';
  predictionError = '';
  requiresLogin = false;

  private lastPredictedMatchIndex: number | null = null;
  private matchSelectionSub?: Subscription;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
    private readonly authService: AuthService,
    private readonly matchesService: MatchesService,
    private readonly predictionService: PredictionService
  ) {
    this.predictionForm = this.formBuilder.group({
      matchIndex: ['', Validators.required]
    });
  }

  // Initializes form/watchers and requests current auth state + match list.
  ngOnInit(): void {
    this.watchMatchSelectionChanges();
    this.checkAuthentication();
    this.loadMatches();
  }

  // Releases value-change subscription to avoid memory leaks.
  ngOnDestroy(): void {
    this.matchSelectionSub?.unsubscribe();
  }

  // True when the match selector control was touched and remains invalid.
  get isMatchMissing(): boolean {
    const control = this.predictionForm.controls.matchIndex;
    return !!control.touched && !!control.invalid;
  }

  // Indicates if there are matches available to predict.
  get hasPredictableMatch(): boolean {
    return this.matches.length > 0;
  }

  // Enables submit only when there is data, auth allows it, and no request is in progress.
  get canPredict(): boolean {
    return this.hasPredictableMatch && !this.isPredicting && !this.requiresLogin;
  }

  // Exposes selected match stage for bracket/status display.
  get selectedMatchStage(): string {
    const selectedMatch = this.getSelectedMatch();
    return selectedMatch?.matchStage || 'Group Stage';
  }

  // Derives a user-friendly winner name from prediction result semantics.
  get projectedWinner(): string {
    if (!this.prediction) {
      return 'TBD';
    }

    const result = (this.prediction.result || '').toLowerCase();
    const homeTeam = this.prediction.homeTeam;
    const awayTeam = this.prediction.awayTeam;

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

  // Validates selection and requests a prediction from backend for the selected match.
  onSubmit(): void {
    this.formError = '';
    this.predictionError = '';
    this.prediction = null;
    this.requiresLogin = false;

    if (this.predictionForm.invalid) {
      this.predictionForm.markAllAsTouched();
      this.formError = this.pageMessages[this.messageIndex.selectMatchError];
      return;
    }

    const selectedMatch = this.getSelectedMatch();
    const selectedMatchIndex = Number(this.predictionForm.value.matchIndex);
    if (!selectedMatch) {
      this.formError = this.pageMessages[this.messageIndex.invalidMatchError];
      return;
    }

    this.isPredicting = true;
    this.predictionService
      .predict(selectedMatch)
      .pipe(
        finalize(() => {
          this.isPredicting = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (response) => {
          this.prediction = response;
          this.lastPredictedMatchIndex = selectedMatchIndex;
          this.cdr.detectChanges();
        },
        error: (error: unknown) => {
          if (error instanceof HttpErrorResponse && (error.status === 401 || error.status === 403)) {
            this.requiresLogin = true;
            this.isAuthenticated = false;
          }

          this.predictionError = this.toPredictionError(error);
          this.cdr.detectChanges();
        }
      });
  }

  // Clears previously displayed prediction when user changes selected match.
  private watchMatchSelectionChanges(): void {
    this.matchSelectionSub = this.predictionForm.controls.matchIndex.valueChanges.subscribe((value) => {
      if (!this.prediction || this.lastPredictedMatchIndex === null) {
        return;
      }

      const currentIndex = Number(value);
      if (currentIndex !== this.lastPredictedMatchIndex) {
        this.prediction = null;
        this.cdr.detectChanges();
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  // Formats each match option text shown in the dropdown list.
  formatMatchOption(match: Match): string {
    const readableDate = new Date(match.matchDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return `${match.homeTeam} vs ${match.awayTeam} - ${match.matchStage} - ${readableDate}`;
  }

  // Generates compact initials used for team badge placeholders.
  getTeamInitials(team: string): string {
    const chunks = team
      .trim()
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean);

    if (chunks.length === 0) {
      return '';
    }

    if (chunks.length === 1) {
      return chunks[0].slice(0, 3).toUpperCase();
    }

    return chunks
      .slice(0, 2)
      .map((chunk) => chunk[0].toUpperCase())
      .join('');
  }

  // Converts backend result codes into readable labels shown in UI.
  formatResultLabel(prediction: PredictionResponse): string {
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

  // Loads matches, keeps upcoming/ongoing fixtures (3-hour window), and sorts by kickoff.
  private loadMatches(): void {
    this.isLoadingMatches = true;
    this.matchesError = '';

    this.matchesService
      .getMatches()
      .pipe(
        timeout(6000),
        finalize(() => {
          this.isLoadingMatches = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (matches) => {
          const nowMexicoCityKey = this.toMexicoCityDateTimeKey(new Date());
          this.matches = matches
            .filter((match) => {
              const kickoff = new Date(match.matchDate);
              const availableUntil = new Date(kickoff.getTime() + this.ongoingMatchWindowMs);

              return this.toMexicoCityDateTimeKey(availableUntil) >= nowMexicoCityKey;
            })
            .sort((firstMatch, secondMatch) => {
              const firstDate = new Date(firstMatch.matchDate).getTime();
              const secondDate = new Date(secondMatch.matchDate).getTime();

              return firstDate - secondDate;
            });
          this.cdr.detectChanges();
        },
        error: () => {
          this.matchesError = this.pageMessages[this.messageIndex.matchesLoadError];
          this.cdr.detectChanges();
        }
      });
  }

  // Builds a sortable Mexico City local-time key for timezone-aware match filtering.
  private toMexicoCityDateTimeKey(date: Date): string {
    const parts = this.mexicoCityDateTimeFormatter.formatToParts(date);
    const pick = (type: Intl.DateTimeFormatPartTypes): string =>
      parts.find((part) => part.type === type)?.value || '00';

    const year = pick('year');
    const month = pick('month');
    const day = pick('day');
    const hour = pick('hour');
    const minute = pick('minute');
    const second = pick('second');

    return `${year}${month}${day}${hour}${minute}${second}`;
  }

  // Verifies current auth session to control UI messaging and login redirect prompts.
  private checkAuthentication(): void {
    this.isCheckingAuth = true;
    this.authStatusMessage = this.pageMessages[this.messageIndex.checkingAuth];

    this.authService
      .getSession()
      .pipe(timeout(6000))
      .subscribe({
        next: (session) => {
          this.isCheckingAuth = false;
          this.isAuthenticated = !!session.authenticated;
          this.authStatusMessage = this.isAuthenticated
            ? ''
            : this.pageMessages[this.messageIndex.noAuthSession];
          this.cdr.detectChanges();
        },
        error: () => {
          this.isCheckingAuth = false;
          this.isAuthenticated = false;
          this.authStatusMessage = this.pageMessages[this.messageIndex.sessionCheckFailed];
          this.cdr.detectChanges();
        }
      });
  }

  // Returns currently selected match object after validating selected index bounds.
  private getSelectedMatch(): Match | undefined {
    const rawIndex = this.predictionForm.value.matchIndex;
    const parsedIndex = Number(rawIndex);

    if (!Number.isInteger(parsedIndex) || parsedIndex < 0 || parsedIndex >= this.matches.length) {
      return undefined;
    }

    return this.matches[parsedIndex];
  }

  // Normalizes backend/network failures into user-facing prediction error messages.
  private toPredictionError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401 || error.status === 403) {
        return this.pageMessages[this.messageIndex.sessionExpired];
      }

      return this.pageMessages[this.messageIndex.predictionFailed];
    }

    return this.pageMessages[this.messageIndex.unexpectedError];
  }
}
