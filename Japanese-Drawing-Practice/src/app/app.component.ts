import { Component, OnInit } from '@angular/core';
import { DrawingCanvasComponent } from './drawing-canvas/drawing-canvas.component';
import * as Tesseract from 'tesseract.js';
@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'Japanese Handwriting Practice';

  clear_canvas = false;
  image_data: ImageData = new ImageData(1, 1);

  randomize = false;
  katakana_practice = false;

  checking_answer = false;
  check_answer_progress = 0;
  checking_task = '';

  done = false;

  debug_mode = false;
  myTesseract: Tesseract.TesseractStatic;
  readonly all_hiragana_chars: string = 'あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだじづでどばびぶべぼぱぴぷぺぽゃゅょっ';
  readonly all_katakana_chars: string = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲンがギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポャュョッー';
  readonly expected_kanji: string = '零一二三四五六七八九十百千万円時分何大学年生日本語私土曜半英毎今明月食行';
  tesseract_settings =
    {
      lang: 'jpn',
      // The kanji '一' often overrides the katakana 'ー'.
      // For katakana practice, it is thus best to not include kanji.
      // Katakana Questions are implemented in ngOnInit, contingent on 'katakana' being a URL argument.
      // The katakana Questions replace the default hiragana/kanji mix if enabled.
      tessedit_char_whitelist: this.all_hiragana_chars + this.expected_kanji,
    };
  result = '';
  correct = null;
  confidence = 0;

  Questions: Question[] =
    [
      new Question('Japan', ['日本', 'にほん'], 'nihon'),
      new Question('college', ['大学', 'だいがく'], 'daigaku'),
      new Question('I', ['私', 'わたし'], 'watashi'),
      new Question('Saturday', ['土曜日', 'どようび'], 'doyoubi'),
      new Question('Sunday', ['日曜日', 'にちようび'], 'nichiyoubi'),
      new Question('today', ['今日', 'きょう'], 'kyou'),
      new Question('tomorrow', ['明日', 'あした'], 'ashita'),
      new Question('one', ['一', 'いち'], 'ichi'),
      new Question('two o\' clock', ['二時', 'にじ'], 'niji'),
      new Question('three o\'clock', ['三時', 'さんじ'], 'sanji'),
      new Question('four', ['四', 'よん', 'し'], 'yon'),
      new Question('five', ['五', 'ご'], 'go'),
      new Question('six o\' clock', ['六時', 'ろくじ'], 'rokuji'),
      new Question('seven', ['七', 'しち', 'なな'], 'shichi'),
      new Question('eight', ['八', 'はち'], 'hachi'),
      new Question('nine', ['九', 'きゅう', 'く'], 'kyu'),
      new Question('ten', ['十', 'じゅう'], 'jyu'),
      new Question('hundred', ['百', 'ひゃく'], 'hyaku'),
      new Question('thousand', ['千', 'せん'], 'sen'),
      new Question('ten thousand', ['万', 'まん'], 'man'),
      new Question('yen', ['円', 'えん'], 'en'),
    ]; // List of Questions [TODO: init from file?]
  question_order: number[]; // randomize this to shuffle Questions
  curr_q_index = 0;    // Index within Question order currently being asked
  curr_question: Question;   // Reference to the current Question
  hint_enabled = false;

  ngOnInit(): void {
    // Import URL arguments.
    const URL_divided = document.URL.split('?');
    if (URL_divided.length > 1) {
      const URL_args: string[] = URL_divided[1].split('&');
      for (let i = 0; i < URL_args.length; i++) {
        if (URL_args[i] === 'randomize') {
          this.randomize = true;
        } else if (URL_args[i] === 'katakana') {
          this.katakana_practice = true;
        }
      }
    }
    // If katakana is enabled, reset tesseract and Question list.
    if (this.katakana_practice) {
      this.tesseract_settings = {
        lang: 'jpn',
        // The kanji '一' often overrides the katakana 'ー'.
        // For katakana practice, it is thus best to not include kanji.
        tessedit_char_whitelist: this.all_katakana_chars,
      };
      this.Questions = [
        new Question('ice cream', ['アイスクリーム'], 'aisukuriim'),
        new Question('jeans', ['ジーンズ'], 'jiinzu'),
        new Question('pen', ['ペン'], 'It\'s already in romaji'),
        new Question('notebook', ['ノート'], 'nooto'),
      ];
    }

    // Fill question_order with 1..[number of Questions].
    this.question_order = [];
    for (let i = 0; i < this.Questions.length; i++) {
      this.question_order.push(i);
    }
    // Shuffle if needed.
    if (this.randomize) {
      this.shuffle();
    }
    this.update_question();
    // Initialize Tesseract
    this.myTesseract = Tesseract.create({
      workerPath: 'https://cdn.rawgit.com/naptha/tesseract.js/1.0.10/dist/worker.js',
      langPath: 'https://cdn.rawgit.com/naptha/tessdata/gh-pages/3.02/',
      corePath: 'https://cdn.rawgit.com/naptha/tesseract.js-core/0.1.0/index.js',
    });
    this.check_answer(true);
    if (this.debug_mode) {
      console.log('Init done.');
    }
  }
  shuffle(): void {
    // Shuffles the values in question_order.
    let j: number, x: number, i: number;
    for (i = this.question_order.length - 1; i > 0; i--) {
      j = Math.floor(Math.random() * (i + 1));
      x = this.question_order[i];
      this.question_order[i] = this.question_order[j];
      this.question_order[j] = x;
    }
  }
  update_image(new_img: ImageData) {
    this.image_data = new_img;
  }
  clear_screen() {
    if (this.debug_mode) {
      console.log(this.clear_canvas);
      console.log('Trying to clear screen.');
    }
    this.clear_canvas = true;
    // setTimeout(function(){this.clear_canvas=false;console.log(this.clear_canvas);},10);
  }
  previous_question(): void {
    if (this.curr_q_index > 0) {
      this.curr_q_index--;
      this.update_question();
    }
  }
  next_question(): void {
    if (this.curr_q_index < this.Questions.length - 1) {
      this.curr_q_index++;
      this.update_question();
    } else {
      this.done = true;
    }
  }
  update_question(): void {
    this.curr_question = this.Questions[this.question_order[this.curr_q_index]];
    this.hint_enabled = false;
    this.result = '';
    this.correct = null;
    this.clear_screen();
  }
  toggle_show_hint(): void {
    this.hint_enabled = !this.hint_enabled;
  }
  get_hint_button_color(): string {
    if (this.hint_enabled) {
      return 'primary';
    } else {
      return '';
    }
  }
  check_answer(init: boolean = false): void {
    if (this.debug_mode) {
      console.log('Checking.');
    }
    // TODO: feed image from canvas into Tesseract; compare result to expected answer
    if (init) {
      this.myTesseract.recognize(
        this.image_data,
        this.tesseract_settings
      )
        .finally(data => console.log(data));
    } else {
      this.checking_answer = true;
      this.myTesseract.recognize(
        this.image_data,
        this.tesseract_settings
      )
        .progress(packet => this.update_progress_bar(packet))
        .then(data => this.apply_result(data.text, data.confidence));
    }
  }
  update_progress_bar(packet): void {
    this.checking_task = packet.status;
    this.check_answer_progress = packet.progress * 100;
  }
  apply_result(text: string, confidence: number): void {
    this.result = this.clear_whitespace_from(text);
    this.correct = this.curr_question.check_answer(this.result);
    this.confidence = confidence;
    this.checking_answer = false;
  }
  get_accuracy_rating_color(): string {
    if (this.confidence < 50) {
      return 'warn';
    } else if (this.confidence < 75) {
      return 'accent';
    } else {
      return 'primary';
    }
  }
  clear_whitespace_from(text: string): string {
    return text.replace(/\s/g, '').trim();
  }
  restart(): void {
    if (this.randomize) {
      this.shuffle();
    }
    this.curr_q_index = 0;
    this.update_question();
    this.done = false;
  }
}
class Question {
  question = '';
  answers: string[] = [''];
  hint = '';
  constructor(question: string, answers: string[], hint: string) {
    this.question = question;
    this.answers = answers;
    this.hint = hint;
  }
  check_answer(potential_ans: string): boolean {
    let to_return = false;
    for (let curr_index = 0; !to_return && curr_index < this.answers.length; curr_index++) {
      if (this.answers[curr_index] === potential_ans) {
        to_return = true;
      }
    }
    return to_return;
  }
}
