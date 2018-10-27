import {
  Component,
  ViewChild,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  Output,
  OnChanges,
  AfterViewInit
} from '@angular/core';

@Component({
  selector: 'app-drawing-canvas',
  templateUrl: './drawing-canvas.component.html',
  styleUrls: ['./drawing-canvas.component.css']
})

export class DrawingCanvasComponent implements OnChanges, AfterViewInit {
  debug_mode = false;
  canvas_ready = false;
  @Input() canvas_width = 500;
  @Input() canvas_height = 200;
  @Input() screen_clear = false;
  @Output()screen_clearChange = new EventEmitter<boolean>();
  @Output()image_drawn = new EventEmitter<ImageData>();
  @ViewChild('drawing_canvas')canvas_elem: ElementRef<HTMLCanvasElement>;

  context: CanvasRenderingContext2D;
  offset_left = 0;
  offset_top = 0;

  paint = false;                     // Whether a line is currently being drawn.
  tool_in_use: tools = tools.Pencil; // Which tool is currently selected.
  points: Point[] = [];              // The points to draw during a redraw.

  ngOnChanges() {
    if (this.screen_clear) {
      this.clear_screen(true);
    }
    this.get_new_canvas_position();
  }

  @HostListener('window:resize')on_resize() {
    this.offset_left = this.canvas_elem.nativeElement.offsetLeft;
    this.offset_top = this.canvas_elem.nativeElement.offsetTop;
  }

  constructor() { }

  ngAfterViewInit(): void {
    // Initialize canvas
    this.context = this.canvas_elem.nativeElement.getContext('2d');
    this.get_new_canvas_position();
    this.clear_screen();
    this.canvas_ready = true;
  }

  get_new_canvas_position() {
    if (this.canvas_ready) {
      const el: HTMLElement = this.canvas_elem.nativeElement;
      this.offset_left = el.offsetLeft;
      this.offset_top = el.offsetTop;
    }
  }
  begin_line(e: MouseEvent): void {
    if (this.debug_mode) {
      console.log('Click!');
    }
    this.paint = true;
    this.add_location(e.pageX - this.offset_left, e.pageY - this.offset_top, false);
  }
  continue_line(e: MouseEvent): void {
    if (this.paint) {
      this.add_location(e.pageX - this.offset_left, e.pageY - this.offset_top, true);
    }
  }
  line_done(): void {
    if (this.debug_mode) {
      console.log('Mouse out.');
    }
    this.paint = false;
  }
  add_location(x: number, y: number, is_dragging: boolean): void {
    if (this.debug_mode) {
      console.log('Adding location at (' + x + ', ' + y + ').');
    }
    this.screen_clearChange.emit(false);
    this.points.push(new Point(x, y, is_dragging, this.tool_in_use));
    this.redraw_canvas();
  }
  redraw_canvas(): void {
    this.clear_screen();

    this.context.lineJoin = 'round';

    for (let i = 0; i < this.points.length; i++) {
      // pick the tool used
      switch (this.points[i].tool) {
        case tools.Pencil:
        {
          this.context.strokeStyle = '#474A51'; // color of graphite
          this.context.lineWidth = 3;
          break;
        }
        case tools.Brush:
        {
          this.context.strokeStyle = 'black';
          if (!this.points[i].is_dragging) {
            this.context.lineWidth = 1.01;
          } else {
            this.context.lineWidth = this.context.lineWidth + ((this.context.lineWidth - 1) * (4 - this.context.lineWidth) * 0.3);
          }
          break;
        }
        case tools.Eraser:
        {
          this.context.strokeStyle = 'white';
          this.context.lineWidth = 5;
          break;
        }
        default:
        {
          break;
        }
      }
      this.context.beginPath();
      if (this.points[i].is_dragging && i) {
        this.context.moveTo(this.points[i - 1].x, this.points[i - 1].y);
      } else {
        this.context.moveTo(this.points[i].x - 1, this.points[i].y);
      }
      this.context.lineTo(this.points[i].x, this.points[i].y);
      this.context.closePath();
      this.context.stroke();
    }
    this.image_drawn.emit(this.context.getImageData(0, 0, this.canvas_width, this.canvas_height));
  }
  select_tool(tool: string): void {
    this.tool_in_use = tools[tool];
  }
  tool_button_color(tool_type: string): string {
    const tool = tools[tool_type];
    if (tool === this.tool_in_use) {
      return 'primary';
    } else {
      return '';
    }
  }
  clear_screen(delete_points: boolean = false): void {
    if (this.canvas_ready) {
      this.context.clearRect(0, 0, this.context.canvas.width, this.context.canvas.height); // Clears the canvas
      this.context.fillStyle = '#FFFFFF';
      this.context.fillRect(0, 0, this.context.canvas.width, this.context.canvas.height);
      if (delete_points) {
        this.points = [];
        if (this.tool_in_use === tools.Eraser) {
          this.tool_in_use = tools.Pencil;
        }
      }
      this.screen_clearChange.emit(true);
    }
  }
}
class Point {
  x = 0;
  y = 0;
  is_dragging = false;
  tool: tools = tools.Eraser;
  constructor(x: number, y: number, is_dragging: boolean, tool_in_use: tools) {
    this.x = x;
    this.y = y;
    this.is_dragging = is_dragging;
    this.tool = tool_in_use;
  }
}
enum tools {
  Pencil = 0,
  Brush = 1,
  Eraser = 2,
}
