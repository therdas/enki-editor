import { redo, undo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { 
    Node as ProseMirrorNode,
} from "prosemirror-model";
import { EditorState, Transaction } from "prosemirror-state";
import { StepMap } from "prosemirror-transform";
import { EditorView, NodeView } from "prosemirror-view";
import { checkIfFlow } from "../../plugins/html";

export class HtmlEditableView implements NodeView {
    dom: HTMLElement;
    innerView: EditorView | null;
    tagName: string | undefined;

    constructor(public node: ProseMirrorNode, public outerView: EditorView, public getPos: () => number | undefined ) {
        this.dom = this.createElementFromString(node.textContent)
        this.dom.classList.add("prosemirror-html-editable");
        
        this.innerView = null;
        this.dom.addEventListener("click", this.openAndFocusOnInner);
    }

    createElementFromString(html: string): HTMLElement {
        let elem: HTMLElement = document.createElement(checkIfFlow(html) ? 'span' : 'div');
        elem.innerHTML = html;
        return elem;
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