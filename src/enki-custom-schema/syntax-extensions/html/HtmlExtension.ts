import { Html, Text } from "mdast";
import { NodeSpec, Node as PMNode, Schema } from "prosemirror-model";
import { NodeExtension } from "prosemirror-unified";
import { remarkFixRootHTML, remarkCombineHTMLTagPairs }  from "../../plugins/html";
import { Processor } from "unified";
import { Node } from "unist";
import { EditorView, NodeView, NodeViewConstructor } from "prosemirror-view";
import { highlight, languages,  } from "prismjs";

export class HtmlViewExtension implements NodeView {
    dom: HTMLElement;
    renderer: HTMLElement;
    editor: HTMLElement | null;
    text: HTMLElement | null;

    constructor(public node: PMNode, public outerView: EditorView, public getPos: () => number | undefined) {
        this.dom = document.createElement('span');
        this.dom.classList.add('prosemirror-html-embed');

        this.renderer = this.dom.appendChild(document.createElement('span'));
        this.renderer.classList.add('prosemirror-unsafe');
        this.renderer.innerHTML = this.node.textContent;

        this.editor = null;
        this.text = null;
    }

    selectNode() {
        this.dom.classList.add('prosemirror-html-embed-editing');
        if (!this.editor) 
            this.open();
    }
    
    deselectNode() {
        this.dom.classList.remove('prosemirror-html-embed-editing');
        this.close()
    }

    open() {
        if(this.editor !== null)
            return;

        this.editor = document.body.appendChild(document.createElement('div'));

        this.editor.classList.add('prosemirror-inline-editor');

        this.text = this.editor.appendChild(document.createElement('code'));
        this.text.contentEditable = "true";
        this.text.innerHTML = highlight(this.node.textContent, languages.html, 'html');
        this.text.classList.add('language-html', 'language-js', 'language-css');

        let done = this.editor.appendChild(document.createElement('span'));
        done.addEventListener('click', this.sync.bind(this, this.text));
        done.classList.add('material-icon');
        done.textContent = 'keyboard_return';
        
        let pos = (this.outerView.domAtPos(this.outerView.state.selection.from).node as HTMLElement).getBoundingClientRect();
        
        this.editor.style.top = pos.top + window.scrollY + 'px';
        this.editor.style.left = pos.left + 'px';
    }

    close() {
        if(this.editor) {
            document.body.removeChild(this.editor);
            this.editor = null;
        }
    }

    sync(elem: HTMLElement, _: Event){

        let tr = this.outerView.state.tr.replaceRangeWith(
            this.outerView.state.selection.from,
            this.outerView.state.selection.to,
            this.outerView.state.schema.nodes['html'].create(null, this.outerView.state.schema.text(elem.textContent + ''))
        );

        // Update from and to. Assume that from stays same.

        this.outerView.dispatch(tr);
        this.close();
    }
}

export class HtmlExtension extends NodeExtension <Html> {
    proseMirrorNodeName(): string {
        return "html"
    }

    unistNodeName(): "html" {
        return 'html';
    }

    proseMirrorNodeView(): NodeViewConstructor | null {
        return (node: PMNode, view: EditorView, getPos: () => number | undefined) => new HtmlViewExtension(node, view, getPos);
    }

    proseMirrorNodeSpec(): NodeSpec | null {
        return {
            content: "text*",
            group: "inline",
            inline: true,
            code: true,
            atom: true,
            marks: '',
            toDOM: (_: PMNode) => {
                return ['code', 0]
            }
        }
    }

    public override proseMirrorNodeToUnistNodes(
        _node: PMNode, 
        convertedChildren: Array<Text>
    ): Array<Html> {
        return [{
            type: 'html',
            value: convertedChildren.map((child) => child.value).join(''),
        }]
    }

    public override unistNodeToProseMirrorNodes(
        node: Html, 
        schema: Schema<string, string>,
    ): Array<PMNode> {
        let retnode = schema.nodes[this.proseMirrorNodeName()].createAndFill(null, schema.text(node.value));
        return (retnode !== null) ? [retnode] : [];
    }

    public override unifiedInitializationHook(processor: Processor<Node, Node, Node, Node, string>): Processor<Node, Node, Node, Node, string> {
        return processor.use(remarkFixRootHTML).use(remarkCombineHTMLTagPairs)
    }
}
//https://stackoverflow.com/questions/3972014/get-contenteditable-caret-position
function getCaretPosition(editableDiv: HTMLElement): number {
  var caretPos = 0,
    sel, range;
  if (window.getSelection) {
    sel = window.getSelection();
    if(sel == null) return -1;
    if (sel.rangeCount) {
      range = sel.getRangeAt(0);
      if (range.commonAncestorContainer.parentNode == editableDiv) {
        caretPos = range.endOffset;
      }
    }
  }
  return caretPos;
}

function setCaret(node: HTMLElement, pos: number) {
    var el = document.getElementById("editable")
    var range = document.createRange()
    var sel = window.getSelection()
    
    if(el == null || sel == null)
        return;

    range.setStart(el.childNodes[2], 5)
    range.collapse(true)
    
    sel.removeAllRanges()
    sel.addRange(range)
}