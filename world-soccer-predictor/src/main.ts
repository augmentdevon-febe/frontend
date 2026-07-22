import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { appProperties } from './app/core/config/app-properties';

bootstrapApplication(AppComponent, appConfig)
  .then(() => {
    document.title = appProperties.appTitle;
  })
  .catch((err) => console.error(err));
