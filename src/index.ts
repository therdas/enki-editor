import { EditorView } from "prosemirror-view"
import { ProseMirrorUnified } from "prosemirror-unified"
import { GFMExtension } from "prosemirror-remark"
import { EditorState} from "prosemirror-state"
import { dropCursor } from "prosemirror-dropcursor"
import { gapCursor } from "prosemirror-gapcursor"
import { history } from "prosemirror-history"
import { GFMTableExtension, HtmlInlayExtension } from "./enki-custom-schema/syntax-extensions"
import { tableEditing, columnResizing, tableNodes, fixTables, goToNextCell } from "prosemirror-tables"
import { keymap } from "prosemirror-keymap"
import { TableView } from "./enki-custom-schema/syntax-extensions/Table/TableView"

import { data } from "./data"

import "../style.sass"
class EnkiEditor {
  public view;
  private pmu = new ProseMirrorUnified([new GFMExtension, new GFMTableExtension, new HtmlInlayExtension]);

  constructor(target: HTMLElement, content: string) {
    console.log(">>>>>>:::",this.pmu.parse(content), this.pmu.schema());
    target.replaceChildren();
    this.view = new EditorView(target, {
      state: EditorState.create({
        doc: this.pmu.parse(content),
        plugins: [
          dropCursor(), 
          gapCursor(), 
          this.pmu.inputRulesPlugin(), 
          this.pmu.keymapPlugin(), 
          history(), 
          columnResizing({View: TableView}), 
          tableEditing(),
          keymap({
            "Tab": goToNextCell(1),
            "Shift-Tab": goToNextCell(-1)
          }),
        ],
        schema: this.pmu.schema(),
      })
    })
  }

  focus() { this.view.focus() }
  destroy() { this.view.destroy() }
  
  getElemId() {
    return this.view.state.selection.$head;
  }

  getCurrentBlock(pos: number) {
    var x = this.view.domAtPos(pos).node;
    if(x instanceof HTMLElement) {
      return x.getBoundingClientRect();
    } else {
      return x.parentElement!.getBoundingClientRect();
    }
  }
}


window.onload = () => {
  let place = document.querySelector("#editor");
  let view: EnkiEditor = new EnkiEditor(<HTMLElement>place, data);  
  let dragHandle = new DragHandle(document.getElementById("draghandle")!, view.view);
}

type Position = {
  top: number,
  left: number
}

type NodeDetails = {
  elem: Node,
  pos: number
}

class DragHandle {
  currentPos: Position = {top: 0, left: 0};
  private element?: HTMLElement;
  private view: EditorView;
  private schema;

  constructor(dragHandle: HTMLElement, view: EditorView) {
    this.element = dragHandle;
    this.view = view;
    this.schema = view.state.schema;
    this.register();
  }

  private updateHandlePosition(position: Position) {
    if(!this.element)
      return;

    let {top, left} = position;

    this.element.style.top = "" + (top) + "px";
    this.element.style.left = "" + (left) + "px";
  }

  private getNodeAtPosition(position: Position): NodeDetails | undefined {
    let res = this.view.posAtCoords(position);
    if(!res)
      return;

    let elem = this.view.nodeDOM(res.inside);
    if(!elem)
      return;
    
    let r = this.view.state.doc.resolve(res.inside);
    let node = r.node(r.depth);
    let parent = r.node(r.depth - 1);
    
    /* We want one of the following elements:
       - A paragraph at depth 0 (that is, a source paragraph)
       - Any other block-type item that is not a paragraph or text
       This is to ensure that we do not select, say, the paragraph inside a line-item or a blockquote. We want to select the item itself.
    */

    // First check if node is a paragraph at level > 0. If not, we should be done
    // if(node.type == schema.nodes.paragraph && r.depth > 0) {
    //   console.log("Inside another node's content", node.type.name, r.depth, parent);
    // } else {
    // }


    return {
      elem: elem,
      pos: res?.inside
    }
  }

  private moveHandler(event: MouseEvent) {
    let pos: Position = {
      left: event.clientX,
      top: event.clientY
    }

    let nodeSelected = this.getNodeAtPosition(pos);
    if(!nodeSelected) return;
    console.log("Drag ended :(");


    //     e.preventDefault();
    //     e.stopImmediatePropagation();
    //     e.stopPropagation();
    //   });
    // }
    
    // function updateDraggerPos(x: number, y: number) {
    //   let elem = document.getElementById("draghandle");
    //   if(!elem) return;
    //   // elem.style.left = ""+ (x - 50)+ "px";
    //   elem.style.left = ""+ (x - 50) + "px";
    //   elem.style.top = ""+ (y - 0) + "px";
    // }
    
    let rect = this.view.coordsAtPos(nodeSelected.pos);

    this.updateHandlePosition({left: rect.left, top: rect.top});
  }

  public register() {
    let elem = this.view.dom;

    let mhandle = (e: MouseEvent) => { this.moveHandler(e) }

    elem.addEventListener('mousemove', mhandle); 

    console.log("Attached movehandle");
  }

}

// window.onload = function () {
//   let place = document.querySelector("#editor");
//   let view: EnkiEditor = new EnkiEditor(<HTMLElement>place, place?.textContent ?? "");

//   document.addEventListener("mousemove", (e: MouseEvent) => {
//     // We want to get the position of our cursor, then update that to head. 
//     let x = e.clientX;
//     let y = e.clientY;

//     let elem = document.getElementById("draghandle");
//     if(!elem) return;
// console.log("OKE");
// Coords({left: x, top: y});

//     if(pos!.pos == -1 || pos?.inside == -1)
//         return

//     let rect = view.view.coordsAtPos(pos!.inside);

//     updateDraggerPos(rect.left, rect.top);
//   })

//   document.querySelector("#draghandle")!.addEventListener("click", (e) => {
//     view.view.focus()
//     let x = 800;
//     let y = (<MouseEvent>e).clientY;
//     console.log(x, y);
//     let pos = view.view.posAtCoords({left: x, top:y});
//     let elem = view.view.state.doc.resolve(pos!.pos);
//     console.log(elem, elem.node(), pos);
    
//     view.view.dispatch(
//       view.view.state.tr.setSelection(
//          NodeSelection.create(view.view.state.doc, pos!.inside)
//       )
//     );

//   });

//   document.querySelector("#draghandle")!.addEventListener("dragstart", (e) => {
//     if(!(e instanceof DragEvent))
//       return;

//     view.focus();

//     if(!e.dataTransfer)KE");
// Coords({left: x, top: 
//       return;

//     let x = e.clientX;
//     let y = e.clientY;
//     console.log(x, y);
//     let pos = view.view.posAtCoords({left: x, top:y});
//     let elem = view.view.state.doc.resolve(pos!.inside);
//     let node = view.view.nodeDOM(pos!.inside);
    
//     view.view.dispatch(
//       view.view.state.tr.setSelection(
//         NodeSelection.create(view.view.state.doc, pos!.inside)
//       )
//     )

//     const slice = view.view.state.selection.content();

//     //convert Slice to a wrapped div
//     const { dom, text } = __serializeForClipboard(view.view, slice);

//     e.dataTransfer.clearData();
//     e.dataTransfer.effectAllowed = "move";
//     e.dataTransfer.setData("text/html", dom.innerHTML);
//     e.dataTransfer.setData("text/plain", text);onsole.log("Drag ended :(");


//     e.preventDefault();
//     e.stopImmediatePropagation();
//     e.stopPropagation();
//   });
// }

// function updateDraggerPos(x: number, y: number) {
//   let elem = document.getElementById("draghandle");
//   if(!elem) return;
//   // elem.style.left = ""+ (x - 50)+ "px";
//   elem.style.left = ""+ (x - 50) + "px";
//   elem.style.top = ""+ (y - 0) + "px";
// }

//     e.dataTransfer.setDragImage(<Element>node!, 0, 0);

//     view.view.dragging = {slice, move: true }
//   });

//   document.querySelector("#draghandle")!.addEventListener("dragend", (e) => {
//     if(!(e instanceof DragEvent))
//       return;
//     console.log("Drag ended :(");


//     e.preventDefault();
//     e.stopImmediatePropagation();
//     e.stopPropagation();
//   });
// }

// function updateDraggerPos(x: number, y: number) {
//   let elem = document.getElementById("draghandle");
//   if(!elem) return;
//   // elem.style.left = ""+ (x - 50)+ "px";
//   elem.style.left = ""+ (x - 50) + "px";
//   elem.style.top = ""+ (y - 0) + "px";
// }
