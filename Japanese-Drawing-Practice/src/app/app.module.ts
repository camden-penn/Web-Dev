import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { DrawingCanvasComponent } from './drawing-canvas/drawing-canvas.component';

import { MatButtonModule, MatProgressBarModule } from '@angular/material';

@NgModule({
  declarations: [
    AppComponent,
    DrawingCanvasComponent
  ],
  imports: [
    BrowserModule,
    MatButtonModule,
    MatProgressBarModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
