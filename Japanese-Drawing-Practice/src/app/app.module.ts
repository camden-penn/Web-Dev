import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { DrawingCanvasComponent } from './drawing-canvas/drawing-canvas.component';

@NgModule({
  declarations: [
    AppComponent,
    DrawingCanvasComponent
  ],
  imports: [
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
