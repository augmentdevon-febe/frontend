import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription, finalize, timeout } from 'rxjs';
import { Match } from '../../core/models/match.model';
import { PredictionResponse } from '../../core/models/prediction-response.model';
import { AuthService } from '../../core/services/auth.service';
import { MatchesService } from '../../core/services/matches.service';
import { PredictionService } from '../../core/services/prediction.service';

@Component({
  selector: 'app-prediction',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './prediction.component.html',
  styleUrl: './prediction.component.css'
})
export class PredictionComponent implements OnInit, OnDestroy {
  readonly predictionForm;

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

  ngOnInit(): void {
    this.watchMatchSelectionChanges();
    this.checkAuthentication();
    this.loadMatches();
  }

  ngOnDestroy(): void {
    this.matchSelectionSub?.unsubscribe();
  }

  get isMatchMissing(): boolean {
    const control = this.predictionForm.controls.matchIndex;
    return !!control.touched && !!control.invalid;
  }

  get hasPredictableMatch(): boolean {
    return this.matches.length > 0;
  }

  get canPredict(): boolean {
    return this.hasPredictableMatch && !this.isPredicting && !this.requiresLogin;
  }

  get selectedMatchStage(): string {
    const selectedMatch = this.getSelectedMatch();
    return selectedMatch?.matchStage || 'Group Stage';
  }

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

  onSubmit(): void {
    this.formError = '';
    this.predictionError = '';
    this.prediction = null;
    this.requiresLogin = false;

    if (this.predictionForm.invalid) {
      this.predictionForm.markAllAsTouched();
      this.formError = 'Please select a match before predicting.';
      return;
    }

    const selectedMatch = this.getSelectedMatch();
    const selectedMatchIndex = Number(this.predictionForm.value.matchIndex);
    if (!selectedMatch) {
      this.formError = 'The selected match is invalid. Please choose another one.';
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

  formatMatchOption(match: Match): string {
    const readableDate = new Date(match.matchDate).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return `${match.homeTeam} vs ${match.awayTeam} - ${match.matchStage} - ${readableDate}`;
  }

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
          this.matches = matches;
          this.cdr.detectChanges();
        },
        error: () => {
          this.matchesError =
            'Unable to load World Cup matches right now. Please refresh and try again.';
          this.cdr.detectChanges();
        }
      });
  }

  private checkAuthentication(): void {
    this.isCheckingAuth = true;
    this.authStatusMessage = 'Checking your authentication status...';

    this.authService
      .getSession()
      .pipe(timeout(6000))
      .subscribe({
        next: (session) => {
          this.isCheckingAuth = false;
          this.isAuthenticated = !!session.authenticated;
          this.authStatusMessage = this.isAuthenticated
            ? ''
            : 'No active authenticated session. Please log in again.';
          this.cdr.detectChanges();
        },
        error: () => {
          this.isCheckingAuth = false;
          this.isAuthenticated = false;
          this.authStatusMessage =
            'Unable to verify session right now. You can still try predicting; backend auth will be enforced.';
          this.cdr.detectChanges();
        }
      });
  }

  private getSelectedMatch(): Match | undefined {
    const rawIndex = this.predictionForm.value.matchIndex;
    const parsedIndex = Number(rawIndex);

    if (!Number.isInteger(parsedIndex) || parsedIndex < 0 || parsedIndex >= this.matches.length) {
      return undefined;
    }

    return this.matches[parsedIndex];
  }

  private toPredictionError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401 || error.status === 403) {
        return 'Your session expired or is not authenticated. Please log in again.';
      }

      return 'Prediction request failed. Please try again in a moment.';
    }

    return 'An unexpected error occurred while predicting the match.';
  }
}
