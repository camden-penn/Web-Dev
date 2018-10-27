# JapaneseDrawingPractice

## Overview

This project implements an HTML canvas element as a drawing board, allowing students to attempt to draw Japanese characters, words, and phrases in response to displayed questions.
The images created are piped through [Tesseract.js](https://github.com/naptha/tesseract.js) to create a Unicode representation of the text.
This text is then checked for accuracy against the list of possible expected answers.

## Dependencies

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 6.2.4.
This project makes use of [Angular Material](https://material.angular.io/), as well as the aforementioned [Tesseract.js](https://github.com/naptha/tesseract.js).