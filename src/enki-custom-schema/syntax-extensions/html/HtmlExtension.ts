import { Html, Text } from "mdast";
import { NodeSpec, Node as PMNode, Schema } from "prosemirror-model";
import { NodeExtension } from "prosemirror-unified";
import { remarkFixRootHTML, remarkCombineHTMLTagPairs }  from "../../plugins/html";
import { Processor } from "unified";
import { Node } from "unist";
import { Decoration, DecorationSource, EditorView, NodeView, NodeViewConstructor, ViewMutationRecord } from "prosemirror-view";
import { highlight, languages,  } from "prismjs";
import { NodeSelection, Selection, SelectionRange } from "prosemirror-state";

export class HtmlViewExtension implements NodeView {
    dom: HTMLElement;
    renderer: HTMLElement;
    editor: HTMLElement | null;
    text: HTMLElement | null;

    constructor(public node: PMNode, public outerView: EditorView, public getPos: () => number | undefined) {
        this.dom = document.createElement('div');
        this.dom.classList.add('prosemirror-html-embed');

        this.renderer = this.dom.appendChild(document.createElement('div'));
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

        this.editor.classList.add('prosemirror-html-editor');

        this.text = this.editor.appendChild(document.createElement('code'));
        this.text.contentEditable = "true";
        this.text.innerHTML = highlight(this.node.textContent, languages.html, 'html');
        this.text.classList.add('language-html', 'language-js', 'language-css');

        let done = this.editor.appendChild(document.createElement('done'));
        done.addEventListener('click', this.sync.bind(this, this.text));
        done.classList.add('font-icon');
        done.textContent = '✓'
        
        let pos = (this.outerView.domAtPos(this.outerView.state.selection.from).node as HTMLElement).getBoundingClientRect();
        
        this.editor.style.top = pos.top + 'px';
        this.editor.style.left = pos.left + 'px';
    }

    close() {
        if(this.editor) {
            document.body.removeChild(this.editor);
            this.editor = null;
        }
    }

    sync(elem: HTMLElement, event: Event){

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
            toDOM: (node: PMNode) => {
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