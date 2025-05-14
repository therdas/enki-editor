import { selectLine } from "@codemirror/commands";
import { MarkType, Node, NodeType } from "prosemirror-model";
import { Command, EditorState, Plugin, Selection } from "prosemirror-state";
import { EditorView, NodeView } from "prosemirror-view";

export type NodeRange = {
    node: Node,
    from: number,
    to: number,
}

const hoist_to = new Map<string, string>([['table_cell', 'table'], ['table_row', 'table'], ['table_col', 'table'], ['paragraph', '^'], ['regular_list_item', '_list']])

function findContainerParent(selection: Selection, state: EditorState) {
    let node = selection.$anchor.node();
    let type = node.type.name;
    let $anchor = selection.$anchor;

    let hoistTo = hoist_to.get(type) ?? 'doc';
    let offset;
    // Selection can be -1 at beginning when editor is unfocussed
    do {
        offset = $anchor.pos - $anchor.parentOffset;
        if(offset <= 0) break;
        $anchor = state.doc.resolve(offset - 1);
        type = $anchor.node().type.name;
        

        // Check if we need to move the goalpost
        let check = hoist_to.get(type);
        if(check)
            hoistTo = check;

        // Special case for paragraph, hoist once and only once
        if(hoistTo == '^'){
            break;
        }
    } while(!type.endsWith(hoistTo) && $anchor.pos >= 0);
    
    if((type.endsWith(hoistTo)) && type !== 'doc')
        return $anchor;
    else
        return selection.$anchor;
}

export function isNodeActive(state: EditorState, typeOrName: NodeType | string) : boolean {
    const { from, to, empty } = state.selection;
    const type = typeOrName instanceof NodeType ? typeOrName.name : typeOrName;

    const nodeRanges: NodeRange[] = []
    state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.isText) return;

        const relativeFrom = Math.max(from, pos);
        const relativeTo= Math.min(to, pos + node.nodeSize);

        nodeRanges.push({
            node, 
            from: relativeFrom,
            to: relativeTo
        })
    })

    const selectionRange = to - from;
    const matchedNodeRanges = nodeRanges
        .filter(nodeRange => {
            if(!type) return true;
            return type === nodeRange.node.type.name
        });
    
    if(empty) return !!matchedNodeRanges.length
    
    const range = matchedNodeRanges.reduce((sum, nodeRange) => sum + nodeRange.to - nodeRange.from, 0)

    return range >= selectionRange;        
}

function isMarkActive(state: EditorState, typeOrName: MarkType | string) {
    const {empty, ranges} = state.selection;
    const type = typeof typeOrName === 'string' ? typeOrName : typeOrName.name;

    if(empty) {
        return !!(state.storedMarks || state.selection.$from.marks())
            .filter((mark) => type === mark.type.name)
            .find(mark => mark.type.name === type)
    } else return false;
}

export interface MenuItem {
    command: Command,
    text: string,
    cls: string[],
    predicate: (view: EditorView) => boolean
}

export interface CMenuItem extends MenuItem {
    _dom: HTMLElement | undefined;
}

function createDOM(text: string, cls: string[]) {
    const elem = document.createElement('span');
    elem.textContent = text;
    elem.classList.add(...cls);
    return elem;
}
 
export class MenuView {
    public dom: HTMLElement;
    public items: CMenuItem[];
    constructor(items: MenuItem[], public editorView: EditorView) {
        this.dom = document.createElement('div');
        this.dom.classList.add('menubar');

        this.items = items.map(({command, text, cls, predicate}) => {
            return {   
                command, 
                text, 
                cls,
                predicate,
                _dom: createDOM(text, cls)
            }
        });
        this.items.forEach(({_dom}) => this.dom.appendChild(_dom!))

        this.update();

        this.dom.addEventListener("mousedown", e =>  {
            e.preventDefault();
            editorView.focus();
            this.items.forEach(({command, _dom}) => {
                if(_dom!.contains(e.target! as HTMLElement))
                    command(editorView.state, editorView.dispatch, editorView)
            })
        }) 
    }
    update() {
        let show = false;
        this.items.forEach(({text, predicate, _dom}) =>  {
            show = show || predicate(this.editorView);
            _dom!.style.display = predicate(this.editorView) ? "" : "none";
            console.log(this.editorView.state.schema.marks);
        })


        this.dom.style.display = show ? "" : "none";
        let $parent = findContainerParent(this.editorView.state.selection, this.editorView.state)
        console.log(">>", $parent.node().type.name);
        let pos = $parent.node().type.name !== 'paragraph' ? $parent.pos - $parent.parentOffset : $parent.pos
        let rect = this.editorView.coordsAtPos(pos)

        this.dom.style.top = rect.top + window.scrollY + 'px';
        this.dom.style.left = rect.left + 'px';
    }

    destroy() {this.dom.remove()}
}

export function menuPlugin(items: MenuItem[]) {
    return new Plugin({
        view(editorView) {
            let menuView = new MenuView(items, editorView);
            editorView.dom.parentElement?.insertBefore(menuView.dom, editorView.dom);
            return menuView
        }
    })
}