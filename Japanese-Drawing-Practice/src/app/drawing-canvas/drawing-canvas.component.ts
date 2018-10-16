import { Component, ViewChild, ElementRef, EventEmitter, HostListener, Input, Output, OnChanges, SimpleChange } from '@angular/core';


@Component({
  selector: 'drawing-canvas',
  templateUrl: './drawing-canvas.component.html',
  styleUrls: ['./drawing-canvas.component.css']
})

export class DrawingCanvasComponent implements OnChanges {
  debugMode:boolean=false;
  canvas_ready:boolean=false;
  @Input('width') canvas_width:number = 500;
  @Input('height') canvas_height:number = 200;
  @Input('clear') request_clear_screen:boolean = false;
  @Output('clearChange')screen_cleared = new EventEmitter<boolean>();
  ngOnChanges(){
    if(this.request_clear_screen){
      this.clear_screen(true);
      this.screen_cleared.emit(false);
    }
    this.get_new_canvas_position();
  }
  @Output()image_drawn = new EventEmitter<ImageData>();

  @ViewChild('drawing_canvas')canvas_elem:ElementRef<HTMLCanvasElement>;
  context:CanvasRenderingContext2D;
  offset_left:number=0;
  offset_top:number=0;
  @HostListener('window:resize')on_resize(){
    this.offset_left = this.canvas_elem.nativeElement.offsetLeft;
    this.offset_top = this.canvas_elem.nativeElement.offsetTop;
  }

  paint:boolean=false; //Whether a line is currently being drawn.
  tool_in_use:tools=tools.Pencil; //Which tool is currently selected.
  points:point[]=[]; //The points to draw during a redraw.
  
  constructor() { }

  
  ngAfterViewInit():void{
    
    //Initialize canvas
    this.context = this.canvas_elem.nativeElement.getContext('2d');
    this.get_new_canvas_position();
    this.clear_screen();
    this.canvas_ready=true;
  }
  get_new_canvas_position(){
    if(this.canvas_ready){
      let el:HTMLElement=this.canvas_elem.nativeElement;
      this.offset_left = el.offsetLeft;
      this.offset_top = el.offsetTop;
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
    this.screen_cleared.emit(false);
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
        case tools.Brush:{
          this.context.strokeStyle="black";
          if(!this.points[i].is_dragging){
            this.context.lineWidth = 1.01;
          }else{
            this.context.lineWidth = this.context.lineWidth + ((this.context.lineWidth-1)*(4 - this.context.lineWidth)*0.3);
          }
          break;
        }
        case tools.Eraser:{
          this.context.strokeStyle = "white"; 
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
    this.image_drawn.emit(this.context.getImageData(0,0,this.canvas_width,this.canvas_height));
  }
  select_tool(tool:string):void{
    this.tool_in_use = tools[tool];
  }
  tool_button_color(tool_type:string):string{
    let tool=tools[tool_type];
    if(tool == this.tool_in_use){
      return 'primary';
    }else{
      return '';
    }
  }
  clear_screen(delete_points:boolean=false):void{
    if(this.canvas_ready){
      this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height); // Clears the canvas
      this.context.fillStyle = "#FFFFFF";
      this.context.fillRect(0,0,this.context.canvas.width, this.context.canvas.height);
      if(delete_points){
        this.points=[];
        if(this.tool_in_use == tools.Eraser){
          this.tool_in_use=tools.Pencil;
        }
      }
    }
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
  Brush = 1,
  Eraser = 2,
}
