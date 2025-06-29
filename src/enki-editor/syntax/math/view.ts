import { Node as PMNode } from "prosemirror-model";
import { EditorView, type MarkView } from "prosemirror-view";
import katex from "katex";

export class MathViewExtension implements MarkView  {
    dom: HTMLElement;
    renderer: HTMLElement;
    editor: HTMLElement | null;
    text: HTMLElement | null;

    constructor(public node: PMNode, public outerView: EditorView, public getPos: () => number | undefined) {
        this.dom = document.createElement('span');
        this.dom.classList.add('prosemirror-html-embed');

        this.renderer = this.dom.appendChild(document.createElement('span'));
        this.renderer.classList.add('prosemirror-katex');

        katex.render(this.node.textContent, this.renderer);

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

        this.editor = document.body.appendChild(document.createElement('span'));

        this.editor.classList.add('prosemirror-inline-editor');

        this.text = this.editor.appendChild(document.createElement('code'));
        this.text.contentEditable = "true";
        this.text.innerHTML = this.node.textContent;

        let done = this.editor.appendChild(document.createElement('span'));
        done.addEventListener('click', this.sync.bind(this, this.text));
        done.classList.add('material-icon');
        done.textContent = 'keyboard_return'
        
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
            this.outerView.state.schema.nodes['inline-math'].create(null, this.outerView.state.schema.text(elem.textContent + ''))
        );

        // Update from and to. Assume that from stays same.

        this.outerView.dispatch(tr);
        this.close();
    }
}