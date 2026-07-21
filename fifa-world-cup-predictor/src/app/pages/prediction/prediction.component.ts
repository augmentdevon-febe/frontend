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
import { getAvailableMatches } from '../../core/helpers/match-filter.helper';
import {
  formatPredictionResultLabel,
  getProjectedWinner,
  mapPredictionErrorMessage
} from '../../core/helpers/prediction-parser.helper';
import { getTeamInitials as buildTeamInitials } from '../../core/helpers/team-badge.helper';
import { AuthService } from '../../core/services/auth.service';
import { AppStateService } from '../../core/services/app-state.service';
import { MatchesService } from '../../core/services/matches.service';
import { PredictionService } from '../../core/services/prediction.service';
import { UiMessageService } from '../../core/services/ui-message.service';

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
/**
 * Component objective:
 * - Provide the main match selection and prediction experience.
 * - Manage prediction execution and result rendering.
 * - Control session-related UX states (auth, requiresLogin, logout).
 *
 * Primary responsibility:
 * - Orchestrate UI interaction and delegate integration/network concerns to services.
 */
export class PredictionComponent implements OnInit, OnDestroy {
  readonly predictionForm;

  private lastPredictedMatchIndex: number | null = null;
  private matchSelectionSub?: Subscription;

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly cdr: ChangeDetectorRef,
    private readonly router: Router,
    private readonly appState: AppStateService,
    private readonly authService: AuthService,
    private readonly matchesService: MatchesService,
    private readonly predictionService: PredictionService,
    private readonly uiMessages: UiMessageService
  ) {
    this.predictionForm = this.formBuilder.group({
      matchIndex: ['', Validators.required]
    });
  }

  get matches(): Match[] {
    return this.appState.matchesSig();
  }

  set matches(value: Match[]) {
    this.appState.setMatches(value);
  }

  get prediction(): PredictionResponse | null {
    return this.appState.predictionSig();
  }

  set prediction(value: PredictionResponse | null) {
    this.appState.setPrediction(value);
  }

  get isLoadingMatches(): boolean {
    return this.appState.isLoadingMatchesSig();
  }

  set isLoadingMatches(value: boolean) {
    this.appState.setIsLoadingMatches(value);
  }

  get isCheckingAuth(): boolean {
    return this.appState.isCheckingAuthSig();
  }

  set isCheckingAuth(value: boolean) {
    this.appState.setIsCheckingAuth(value);
  }

  get isPredicting(): boolean {
    return this.appState.isPredictingSig();
  }

  set isPredicting(value: boolean) {
    this.appState.setIsPredicting(value);
  }

  get isLoggingOut(): boolean {
    return this.appState.isLoggingOutSig();
  }

  set isLoggingOut(value: boolean) {
    this.appState.setIsLoggingOut(value);
  }

  get isAuthenticated(): boolean {
    return this.appState.isAuthenticatedSig();
  }

  set isAuthenticated(value: boolean) {
    this.appState.setIsAuthenticated(value);
  }

  get authStatusMessage(): string {
    return this.appState.authStatusMessageSig();
  }

  set authStatusMessage(value: string) {
    this.appState.setAuthStatusMessage(value);
  }

  get matchesError(): string {
    return this.appState.matchesErrorSig();
  }

  set matchesError(value: string) {
    this.appState.setMatchesError(value);
  }

  get formError(): string {
    return this.appState.formErrorSig();
  }

  set formError(value: string) {
    this.appState.setFormError(value);
  }

  get predictionError(): string {
    return this.appState.predictionErrorSig();
  }

  set predictionError(value: string) {
    this.appState.setPredictionError(value);
  }

  get requiresLogin(): boolean {
    return this.appState.requiresLoginSig();
  }

  set requiresLogin(value: boolean) {
    this.appState.setRequiresLogin(value);
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
    return getProjectedWinner(this.prediction);
  }

  // Validates selection and requests a prediction from backend for the selected match.
  onSubmit(): void {
    this.formError = '';
    this.predictionError = '';
    this.prediction = null;
    this.requiresLogin = false;

    if (this.predictionForm.invalid) {
      this.predictionForm.markAllAsTouched();
      this.formError = this.uiMessages.messages.prediction.selectMatchError;
      return;
    }

    const selectedMatch = this.getSelectedMatch();
    const selectedMatchIndex = Number(this.predictionForm.value.matchIndex);
    if (!selectedMatch) {
      this.formError = this.uiMessages.messages.prediction.invalidMatchError;
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

  logOff(): void {
    if (this.isLoggingOut) {
      return;
    }

    this.isLoggingOut = true;
    this.authService
      .logout()
      .pipe(
        timeout(6000),
        finalize(() => {
          this.isLoggingOut = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: () => {
          this.authService.startGoogleLogin();
        },
        error: () => {
          this.authService.startGoogleLogin();
        }
      });
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
    return buildTeamInitials(team);
  }

  // Converts backend result codes into readable labels shown in UI.
  formatResultLabel(prediction: PredictionResponse): string {
    return formatPredictionResultLabel(prediction);
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
          this.matches = getAvailableMatches(matches);
          this.cdr.detectChanges();
        },
        error: () => {
          this.matchesError = this.uiMessages.messages.prediction.matchesLoadError;
          this.cdr.detectChanges();
        }
      });
  }

  // Verifies current auth session to control UI messaging and login redirect prompts.
  private checkAuthentication(): void {
    this.isCheckingAuth = true;
    this.authStatusMessage = this.uiMessages.messages.prediction.checkingAuth;

    this.authService
      .getSession()
      .pipe(timeout(6000))
      .subscribe({
        next: (session) => {
          this.isCheckingAuth = false;
          this.isAuthenticated = !!session.authenticated;
          this.authStatusMessage = this.isAuthenticated
            ? ''
            : this.uiMessages.messages.prediction.noAuthSession;
          this.cdr.detectChanges();
        },
        error: () => {
          this.isCheckingAuth = false;
          this.isAuthenticated = false;
          this.authStatusMessage = this.uiMessages.messages.prediction.sessionCheckFailed;
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
    return mapPredictionErrorMessage(error, this.uiMessages.predictionErrorSet());
  }
}
