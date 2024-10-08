import type { Html, Text } from "mdast";
import { redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { 
    NodeSpec,
    Node as ProseMirrorNode,
    Schema
} from "prosemirror-model";
import { TextExtension } from "prosemirror-remark";
import { EditorState, Transaction } from "prosemirror-state";
import { StepMap } from "prosemirror-transform";
import { Extension, NodeExtension } from "prosemirror-unified";
import { EditorView, NodeView } from "prosemirror-view";
import { Processor } from "unified";
import { Node } from "unist";
import remarkFixRootHTML from "../../plugins/html";

export class HtmlInlayView implements NodeView {
    dom: HTMLElement;
    innerView: EditorView | null;
    tagName: string | undefined;
    isFlow: boolean;

    constructor(public node: ProseMirrorNode, public outerView: EditorView, public getPos: () => number | undefined ) {

        let elem = this.createElementFromString(node.textContent);
        this.dom = elem.element;
        this.isFlow = elem.isFlow;
        
        console.log("A?", elem, node.textContent);

        this.dom.classList.add("prosemirror-html-editable");
        this.innerView = null;
        this.dom.addEventListener("click", this.openAndFocusOnInner);
    }

    createElementFromString(html: string): {
        element: HTMLElement,
        isFlow: boolean
    } {
        let dom: HTMLElement | null = null;
        let res = HtmlInlayView.checkIfFlow(html);

        if(res.isFlow) {
            this.tagName = res.tag;

            let template = document.createElement('template');
            template.innerHTML = html;
            dom = <HTMLElement>(template.content.firstChild!);
        }

        if(dom === null) {
            dom = document.createElement("div");
            dom.innerHTML = html;
        }

        return {
            element: dom,
            isFlow: res.isFlow
        }
    }

    /**
     * Check if the value of this node (contained HTML) can be parsed as a single tag.
     * @param html String to be checked
     * @returns true, if the html is a single tag, false otherwise
     */
    static checkIfFlow(html: string): {
        isFlow: boolean, 
        tag?: string, 
        type?: 'opening' | 'closing' | 'other'
    } {
        // Check if string starts with '<', ends with '>' and has only one of each tag.
        const single =  html[0] == "<" && (html.match(/</g)||[]).length == 1 &&
                        html[html.length - 1] == ">" && (html.match(/>/g)||[]).length == 1;

        // Given that the node is a single tag (flow), we can assume it to
        // be well formed. We just need to check for the type of node it is.
        const comment = single && (html.slice(1, 3) === "--");
        const closing = single && (html[1] == "/");
        const processing = single && (html[1] == "?");
        const declaration = single && (html[1] == "!");
        const CDATA = single && (html.slice(1, 9) === "![CDATA[");

        
        // We can use a simple extraction of the string from [1, <first occurence of a space character>].
        if(comment || processing || declaration || CDATA) {
            return {
                isFlow: true,
                tag: undefined,
                type: 'other'
            }
        } else if(single)  {
            const close = Math.min(html.indexOf(' '), html.indexOf(">"), html.indexOf('/'));
            const tagName = html.slice(closing ? 2 : 1, close);
            return {
                isFlow: true, 
                tag: tagName,
                type: closing ? 'opening' : 'closing',
            }
        } else return {
            isFlow: false,
            tag: undefined,
            type: undefined
        }
    }

    selectNode() {
        this.dom.classList.add("ProseMirror-selectednode")
        if(!this.innerView) this.open();
    }

    deselectNode() {
        this.dom.classList.remove("ProseMirror-selectednode")
        if(this.innerView) this.close();
    }

    openAndFocusOnInner() {
        const element = this;
        return function() {
            element.open();
            console.log("Opening editor");
            element.innerView?.focus();
        }
    }

    // Do not let `flow` type elements to be edited
    open() {
        if(this.isFlow) return;

        let editableArea = this.dom.appendChild(document.createElement("div"));
        editableArea.className = "ProseMirror-edithtml";
        this.innerView = new EditorView(editableArea, {
            state: EditorState.create({
                doc: this.node,
                plugins: [keymap({
                    "Mod-z": () => undo(this.outerView.state, this.outerView.dispatch),
                    "Mod-y": () => redo(this.outerView.state, this.outerView.dispatch),
                })]
            }),
            dispatchTransaction: this.dispatchInner.bind(this),
            handleDOMEvents: {
                mousedown: () => {
                    if(this.outerView.hasFocus()) this.innerView?.focus();
                }
            }
        })
        editableArea.classList.add('prosemirror-raw-html-editor')
    }

    close() {
        this.innerView?.destroy();
        this.innerView = null;
        this.dom.innerHTML = this.node.textContent;
    }

    dispatchInner(tr: Transaction) {
        if(!this.innerView) return;
        let {state, transactions} = this.innerView!.state.applyTransaction(tr);
        this.innerView.updateState(state);

        if(!tr.getMeta("fromOutside")) {
            let outerTr = this.outerView.state.tr;
            let pos = this.getPos()!;
            let offsetMap = StepMap.offset(pos + 1);
            for(let i = 0; i < transactions.length; ++i) {
                let steps = transactions[i].steps;
                for(let j = 0; j < steps.length; ++j) {
                    outerTr.step(steps[j].map(offsetMap)!);
                }
            }
            if(outerTr.docChanged) this.outerView.dispatch(outerTr);
        }
    }

    update(node: ProseMirrorNode) {
        if (!node.sameMarkup(this.node)) return false;
        this.node = node
        if (this.innerView) {
            let state = this.innerView.state
            let start = node.content.findDiffStart(state.doc.content)
            if (start != null) {
                let {a: endA, b: endB} = node.content.findDiffEnd(state.doc.content)!;
                let overlap = start - Math.min(endA, endB)
                if (overlap > 0) { endA += overlap; endB += overlap }
                this.innerView.dispatch(
                state.tr
                    .replace(start, endB, node.slice(start, endA))
                    .setMeta("fromOutside", true))
            }
        }
        return true  
    }

    destroy() {
        if (this.innerView) this.close()
    }

    stopEvent(event: Event): boolean {
        let target = (<HTMLElement>event.target);
        if(this.innerView == null)
            return false;
        return this.innerView && this.innerView.dom.contains(target);
    }

    ignoreMutation() { return true }
}

export class HtmlInlayExtension extends NodeExtension<Html> {
    // public override proseMirrorKeymap (
    //     _: Schema<string, string>,
    // ): Record<string, Command> {
    //     return {

    //     }
    // }

    public override dependencies(): Array<Extension> {
        return [new TextExtension()];
    }

    public override proseMirrorNodeName(): string {
        return "html";
    }

    public override proseMirrorNodeSpec(): NodeSpec {
        return {
            content: "text*",
            group: "inline",
            inline: true,
            atom: true,
            marks: '',
            code: true,
            defining: true
        }
    }

    public override proseMirrorNodeToUnistNodes(_node: ProseMirrorNode, 
        convertedChildren: Array<Text>
    ): Array<Html> {
        return [{
            type: 'html',
            value: convertedChildren.map((child) => child.value).join(''),
        }]
    }

    public override unistNodeName(): "html" {
        return "html"
    }

    public override unistNodeToProseMirrorNodes(
        node: Html, 
        schema: Schema<string, string>,
        convertedChildren: Array<ProseMirrorNode>, 
        context : Partial<Record<string, never>>
    ): Array<ProseMirrorNode> {
        let retnode = schema.nodes[this.proseMirrorNodeName()].createAndFill(null, schema.text(node.value));
        console.log("RETNODE", [retnode], retnode?.childCount);
        return (retnode !== null) ? [retnode] : [];
    }

    public override unifiedInitializationHook(processor: Processor<Node, Node, Node, Node, string>): Processor<Node, Node, Node, Node, string> {
        return processor.use(remarkFixRootHTML);
    }
}

