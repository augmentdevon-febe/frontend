type AppPropertiesWindow = Window & {
  __APP_PROPERTIES__?: {
    appTitle?: string;
    tournamentName?: string;
    tournamentEyebrow?: string;
    loginSubtitle?: string;
    predictionSubtitle?: string;
    bracketAriaLabel?: string;
  };
};

const runtimeAppProperties = (window as AppPropertiesWindow).__APP_PROPERTIES__ || {};

export const appProperties = {
  appTitle: runtimeAppProperties.appTitle || 'Liga Mx Torneo de Invierno Predictor',
  tournamentName: runtimeAppProperties.tournamentName || 'Liga Mx Torneo de Invierno',
  tournamentEyebrow: runtimeAppProperties.tournamentEyebrow || 'Liga Mx Torneo de Invierno',
  loginSubtitle:
    runtimeAppProperties.loginSubtitle ||
    'Login with Google to predict Liga Mx Torneo de Invierno match results using Open AI.',
  predictionSubtitle:
    runtimeAppProperties.predictionSubtitle ||
    'Pick a match, run the model by clicking the "Predict result" button, and see the Open AI expected result.',
  bracketAriaLabel:
    runtimeAppProperties.bracketAriaLabel || 'Liga Mx Torneo de Invierno bracket snapshot'
} as const;
