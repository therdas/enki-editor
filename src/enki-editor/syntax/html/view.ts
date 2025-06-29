import { Node as PMNode } from "prosemirror-model";
import { EditorView, type NodeView } from "prosemirror-view";

import {EditorView as CMEditorView, dropCursor} from "@codemirror/view";
import { highlightSpecialChars, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { indentOnInput, syntaxHighlighting, defaultHighlightStyle, bracketMatching } from "@codemirror/language";
import {
  autocompletion, completionKeymap, closeBrackets,
  closeBracketsKeymap
} from "@codemirror/autocomplete"
import { javascript } from "@codemirror/lang-javascript";

export class HtmlViewExtension implements NodeView {
    dom: HTMLElement;
    renderer: HTMLElement;
    editor: HTMLElement | null;
    text: CMEditorView | null;

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

        const cmElement = document.createElement('div');

        this.text = new CMEditorView({
            doc: this.node.textContent,
            parent: cmElement,
            extensions: [
                highlightSpecialChars(),
                history(),
                dropCursor(),
                indentOnInput(),
                syntaxHighlighting(defaultHighlightStyle),
                bracketMatching(),
                closeBrackets(),
                autocompletion(),
                keymap.of(
                    [
                        ...closeBracketsKeymap,
                        ...defaultKeymap,
                        ...historyKeymap,
                        ...completionKeymap
                    ]
                ),
                javascript({typescript: false})
            ]
        })

        this.editor.appendChild(cmElement)

        // this.text = this.editor.appendChild(document.createElement('code'));
        // this.text.contentEditable = "true";
        // this.text.innerHTML = highlight(this.node.textContent, languages.html, 'html');
        // this.text.classList.add('language-html', 'language-js', 'language-css');

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

    sync(elem: CMEditorView, _: Event){

        let tr = this.outerView.state.tr.replaceRangeWith(
            this.outerView.state.selection.from,
            this.outerView.state.selection.to,
            this.outerView.state.schema.nodes['html'].create(null, this.outerView.state.schema.text(elem.state.doc.toString() + ''))
        );

        // Update from and to. Assume that from stays same.

        this.outerView.dispatch(tr);
        this.close();
    }
}
