import { Component, OnInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { MatButtonModule, MatIconModule } from '@angular/material';
import * as Tesseract from 'tesseract.js';
import { ThrowStmt } from '@angular/compiler';
@Component({
  selector: 'drawing-canvas',
  templateUrl: './drawing-canvas.component.html',
  styleUrls: ['./drawing-canvas.component.css']
})
export class DrawingCanvasComponent implements OnInit {
  randomize:boolean=false;
  done:boolean = false;

  debugMode:boolean = false;

  @ViewChild('drawing_canvas')canvas_elem:ElementRef<HTMLCanvasElement>;
  context:CanvasRenderingContext2D;
  offset_left:number=0;
  offset_top:number=0;
  canvas_width: 800;
  canvas_height: 400;
  @HostListener('window:resize')on_resize(){
    this.offset_left = this.canvas_elem.nativeElement.offsetLeft;
    this.offset_top = this.canvas_elem.nativeElement.offsetTop;
  }

  paint:boolean=false; //Whether a line is currently being drawn.
  tool_in_use:tools=tools.Pencil; //Which tool is currently selected.
  points:point[]=[]; //The points to draw during a redraw.
  
  myTesseract:Tesseract.TesseractStatic;
  tesseract_settings=
  {
    lang: 'jpn',
    textord_min_xheight: 10,
  };

  result:string='';
  correct:boolean = null;

  questions:question[]=
  [
    new question('Japan',['日本','にほん'],'nihon'),
    new question('college',['大学','だいがく'],'daigaku'),
    new question('ice cream',['アイスクリーム'],'Use katakana'),
    new question('one',['一','いち'],'ichi'),
    new question('two',['ニ','に'],'ni'),
    new question('three',['三','さん'],'san'),
    new question('four',['四','よん','し'],'yon'),
    new question('five',['五','ご'],'go'),
    new question('six',['六','ろく'],'roku'),
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
  curr_q_index=0; //Index within question order currently being asked
  curr_question:question; //Reference to the current question
  hint_enabled:boolean = false;
  constructor() { }

  ngOnInit() {
    //Fill question_order with 1..number of questions.
    this.question_order=[];
    for(let i=0;i<this.questions.length;i++){
      this.question_order.push(i);
    }
    //Shuffle if needed.
    if(this.randomize){
      this.shuffle();
    }
    
  }
  shuffle(){
    //Shuffle the values in question_order.

  }
  ngAfterViewInit():void{
    
    //Initialize canvas
    this.context = this.canvas_elem.nativeElement.getContext('2d');
    let el:HTMLElement=this.canvas_elem.nativeElement;
    this.offset_left = el.offsetLeft;
    this.offset_top = el.offsetTop;
    this.clear_screen();
    
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

  begin_line(e:MouseEvent):void{
    if(this.debugMode){
      console.log('Click!')
    }
    this.paint=true;
    this.add_location(e.pageX - this.offset_left,e.pageY-this.offset_top,false);
  }
  continue_line(e:MouseEvent):void{
    if(this.paint){
      this.add_location(e.pageX - this.offset_left,e.pageY-this.offset_top,true);
    }
  }
  line_done():void{
    if(this.debugMode){
      console.log('Mouse out.')
    }
    this.paint=false;
  }
  add_location(x:number,y:number,is_dragging:boolean):void{
    if(this.debugMode){
      console.log('Adding location at (' + x + ', ' + y + ').')
    }
    this.points.push(new point(x,y,is_dragging,this.tool_in_use));
    this.redraw_canvas();
  }
  redraw_canvas():void{
    this.clear_screen();
  
    this.context.lineJoin = "round";
    
    for(let i=0; i < this.points.length; i++) {	
      //pick the tool used
      switch(this.points[i].tool){
        case tools.Pencil:{
          this.context.strokeStyle = "#474A51"; //color of graphite
          this.context.lineWidth = 3;
          break;
        }
        case tools.Eraser:{
          this.context.strokeStyle = "#FFFFFF"; //white
          this.context.lineWidth = 5;
          break;
        }
        default:{
          break;
        }
      }	
      this.context.beginPath();
      if(this.points[i].is_dragging && i){
        this.context.moveTo(this.points[i-1].x, this.points[i-1].y);
      }else{
        this.context.moveTo(this.points[i].x-1, this.points[i].y);
      }
      this.context.lineTo(this.points[i].x, this.points[i].y);
      this.context.closePath();
      this.context.stroke();
    }
  }
  draw_mode(){
    this.tool_in_use = tools.Pencil;
  }
  eraser_mode(){
    this.tool_in_use = tools.Eraser;
  }
  clear_screen(delete_points:boolean=false){
    this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height); // Clears the canvas
    this.context.fillStyle = "#FFFFFF";
    this.context.fillRect(0,0,this.context.canvas.width, this.context.canvas.height);
    if(delete_points){
      this.points=[];
      this.tool_in_use=tools.Pencil;
    }
  }
  previous_question(){
    if(this.curr_q_index>0){
      this.curr_q_index--;
      this.update_question();
    }
  }
  next_question(){
    if(this.curr_q_index<this.questions.length-1){
      this.curr_q_index++;
      this.update_question();
    }else{
      this.done = true;
    }
  }
  update_question(){
    this.curr_question = this.questions[this.question_order[this.curr_q_index]]; 
    this.hint_enabled = false;
    this.points=[];
    this.result='';
    this.correct=null;
    this.clear_screen(true);
  }
  show_hint(){
    this.hint_enabled=true;
  }
  check_answer(init:boolean=false){
    if(this.debugMode){
      console.log('Checking.')
    }
    //TODO: feed image from canvas into Tesseract; compare result to expected answer
    if(init){
      this.myTesseract.recognize(this.context, 
          this.tesseract_settings
        )
        .progress(packet => console.info(packet))
        .then(data => console.log(data))
        .finally(data => console.log(data))
    }else{
      this.myTesseract.recognize(this.context, 
        this.tesseract_settings
      )
      .progress(packet => console.info(packet))
      .then(data => this.apply_result(data.text))
    }
  }
  apply_result(text:string){
    this.result=this.clear_whitespace_from(text);
    this.correct = this.curr_question.check_answer(this.result);
  }
  clear_whitespace_from(text:string):string{
    return text.replace(/\s/,'').trim();
  }
  restart(){
    if(this.randomize){
      this.shuffle();
    }
    this.curr_q_index=0;
    this.update_question();
    this.done=false;
  }
}
class point{
  x:number=0;
  y:number=0;
  is_dragging:boolean=false;
  tool:tools = tools.Eraser;
  constructor(x:number,y:number,is_dragging:boolean,tool_in_use:tools){
    this.x=x;
    this.y=y;
    this.is_dragging=is_dragging;
    this.tool = tool_in_use;
  }
}
enum tools{
  Pencil = 0,
  Eraser = 1,
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