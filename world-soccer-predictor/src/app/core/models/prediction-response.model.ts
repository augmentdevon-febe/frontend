export interface PredictionResponse {
  homeTeam: string;
  awayTeam: string;
  predictedScore: string;
  predictedHomeGoals?: number;
  predictedAwayGoals?: number;
  result: string;
  confidence?: number;
  modelVersion?: string;
  providerName?: string;
  providerModel?: string;
  explanation: string;
  factors?: {
    defensiveStability?: number;
    tournamentStageEffect?: number;
    attackingQuality?: number;
    venueNeutrality?: number;
    teamStrength?: number;
  };
  requestedAt?: string;
  rawProviderResponse?: string;
}
