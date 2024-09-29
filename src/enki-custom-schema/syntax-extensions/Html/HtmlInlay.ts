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

    constructor(public node: ProseMirrorNode, public outerView: EditorView, public getPos: () => number | undefined ) {
        console.log("WHAT");
        this.dom = document.createElement("div");
        this.dom.classList.add("prosemirror-html-editable")
        this.dom.innerHTML = node.textContent;
        this.innerView = null;

        this.dom.addEventListener("click", this.openAndFocusOnInner);
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

    open() {
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

