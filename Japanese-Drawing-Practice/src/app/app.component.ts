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
  
  clear_canvas:boolean=false;
  image_data:ImageData=new ImageData(1,1);

  randomize:boolean=false;
  katakana:boolean=false;
  
  checking_answer:boolean=false;
  check_answer_progress:number=0;
  checking_task:string="";

  done:boolean = false;

  debugMode:boolean = false;
  myTesseract:Tesseract.TesseractStatic;
  readonly all_hiragana_chars:string='あいうえおかきくけこさしすせそたちつてとなにぬねのはひふへほまみむめもやゆよらりるれろわをんがぎぐげござじずぜぞだじづでどばびぶべぼぱぴぷぺぽゃゅょっ';
  readonly all_katakana_chars:string='アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフへホマミムメモヤユヨラリルレロワヲンがギグゲゴザジズゼゾダヂヅデドバビブベボパピプペポャュョッー';
  readonly expected_kanji:string='零一二三四五六七八九十百千万円時分何大学年生日本語私土曜半英毎今明月食行';
  tesseract_settings=
  {
    lang: 'jpn',
    //The kanji '一' often overrides the katakana 'ー'. 
    //For katakana practice, it is thus best to not include kanji.
    tessedit_char_whitelist: this.all_hiragana_chars+this.all_katakana_chars+this.expected_kanji,
  };
  result:string='';
  correct:boolean = null;
  confidence:number=0;

  questions:question[]=
  [
    new question('Japan',['日本','にほん'],'nihon'),
    new question('college',['大学','だいがく'],'daigaku'),
    new question('I',['私','わたし'],'watashi'),
    new question('Saturday',['土曜日','どようび'],'doyoubi'),
    new question('Sunday',['日曜日','にちようび'],'nichiyoubi'),
    new question('today',['今日','きょう'],'kyou'),
    new question('tomorrow',['明日','あした'],'ashita'),
    new question('one',['一','いち'],'ichi'),
    new question('two o\' clock',['二時','にじ'],'niji'),
    new question('three o\'clock',['三時','さんじ'],'sanji'),
    new question('four',['四','よん','し'],'yon'),
    new question('five',['五','ご'],'go'),
    new question('six o\' clock',['六時','ろくじ'],'rokuji'),
    new question('seven',['七','しち','なな'],'shichi'),
    new question('eight',['八','はち'],'hachi'),
    new question('nine',['九','きゅう','く'],'kyu'),
    new question('ten',['十','じゅう'],'jyu'),
    new question('hundred',['百','ひゃく'],'hyaku'),
    new question('thousand',['千','せん'],'sen'),
    new question('ten thousand',['万','まん'],'man'),
    new question('yen',['円','えん'],'en'),
  ]; //List of questions [TODO: init from file?]
  question_order:number[]; //randomize this to shuffle questions
  curr_q_index:number=0; //Index within question order currently being asked
  curr_question:question; //Reference to the current question
  hint_enabled:boolean = false;

  ngOnInit():void {
    //Import URL arguments.
    let URL_divided=document.URL.split('?');
    if(URL_divided.length>1){
      let URL_args:string[] = URL_divided[1].split('&');
      for(let i=0;i<URL_args.length;i++){
        if (URL_args[i]=='randomize'){
          this.randomize=true;
        }else if(URL_args[i]=='katakana'){
          this.katakana=true;
        }
      }
    } 
    //If katakana is enabled, reset tesseract and question list.
    if(this.katakana){
      this.tesseract_settings=
      {
        lang: 'jpn',
        //The kanji '一' often overrides the katakana 'ー'. 
        //For katakana practice, it is thus best to not include kanji.
        tessedit_char_whitelist: this.all_katakana_chars,
      };
      this.questions=[
        new question('ice cream',['アイスクリーム'],'aisukuriim'),
        new question('jeans',['ジーンズ'],'jiinzu'),
        new question('pen',['ペン'],'It\'s already in romaji'),
        new question('notebook',['ノート'],'nooto'),
      ]
    }
    

    //Fill question_order with 1..[number of questions].
    this.question_order=[];
    for(let i=0;i<this.questions.length;i++){
      this.question_order.push(i);
    }
    //Shuffle if needed.
    if(this.randomize){
      this.shuffle();
    }
    this.update_question();
    //Initialize Tesseract
    this.myTesseract = Tesseract.create({
      workerPath: 'https://cdn.rawgit.com/naptha/tesseract.js/1.0.10/dist/worker.js',
      langPath: 'https://cdn.rawgit.com/naptha/tessdata/gh-pages/3.02/',
      corePath: 'https://cdn.rawgit.com/naptha/tesseract.js-core/0.1.0/index.js',
    });
    this.check_answer(true);
    if(this.debugMode){
      console.log('Init done.')
    }
  }
  shuffle():void{
    //Shuffles the values in question_order.
    let j:number, x:number, i:number;
    for (i = this.question_order.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = this.question_order[i];
        this.question_order[i] = this.question_order[j];
        this.question_order[j] = x;
    }
  }
  update_image(new_img:ImageData){
    this.image_data=new_img;
  }
  clear_screen(){
    if(this.debugMode){
      console.log(this.clear_canvas)
      console.log('Trying to clear screen.')
    }
    this.clear_canvas=true;
    //setTimeout(function(){this.clear_canvas=false;console.log(this.clear_canvas);},10);
  }
  previous_question():void{
    if(this.curr_q_index>0){
      this.curr_q_index--;
      this.update_question();
    }
  }
  next_question():void{
    if(this.curr_q_index<this.questions.length-1){
      this.curr_q_index++;
      this.update_question();
    }else{
      this.done = true;
    }
  }
  update_question():void{
    this.curr_question = this.questions[this.question_order[this.curr_q_index]]; 
    this.hint_enabled = false;
    this.result='';
    this.correct=null;
    this.clear_screen();
  }
  toggle_show_hint():void{
    this.hint_enabled=!this.hint_enabled;
  }
  get_hint_button_color():string{
    if(this.hint_enabled){
      return 'primary';
    }else{
      return '';
    }
  }
  check_answer(init:boolean=false):void{
    if(this.debugMode){
      console.log('Checking.')
    }
    //TODO: feed image from canvas into Tesseract; compare result to expected answer
    if(init){
      this.myTesseract.recognize(this.image_data, 
          this.tesseract_settings
        )
        .progress(packet => console.info(packet))
        .then(data => console.log(data))
        .finally(data => console.log(data))
    }else{
      this.checking_answer=true;
      this.myTesseract.recognize(this.image_data, 
        this.tesseract_settings
      )
      .progress(packet => this.update_progress_bar(packet))
      .then(data => this.apply_result(data.text,data.confidence))
    }
  }
  update_progress_bar(packet):void{
    this.checking_task = packet.status;
    this.check_answer_progress = packet.progress*100;
  }
  apply_result(text:string,confidence:number):void{
    this.result=this.clear_whitespace_from(text);
    this.correct = this.curr_question.check_answer(this.result);
    this.confidence=confidence;
    this.checking_answer=false;
  }
  get_accuracy_rating_color():string{
    if(this.confidence < 50){
      return 'warn';
    }else if(this.confidence < 75){
      return 'accent';
    }else{
      return 'primary';
    }
  }
  clear_whitespace_from(text:string):string{
    return text.replace(/\s/g,'').trim();
  }
  restart():void{
    if(this.randomize){
      this.shuffle();
    }
    this.curr_q_index=0;
    this.update_question();
    this.done=false;
  }
}
class question{
  question:string='';
  answers:string[]=[''];
  hint:string="";
  constructor(question:string,answers:string[],hint:string){
    this.question=question;
    this.answers=answers;
    this.hint=hint;
  }
  check_answer(potential_ans:string):boolean{
    let to_return:boolean=false;
    for(let curr_index:number=0;!to_return && curr_index < this.answers.length; curr_index++){
      if(this.answers[curr_index]==potential_ans){
        to_return = true;
      }
    }
    return to_return;
  }
}
