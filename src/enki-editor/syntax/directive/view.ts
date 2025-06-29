import { Node as PMNode } from "prosemirror-model";
import { EditorView, type NodeView } from "prosemirror-view";

export class DirectiveView implements NodeView {
    dom: HTMLElement;
    contentDOM: HTMLElement;
    pluginDOM: HTMLElement | undefined;         // Element wrapping around contentDOM          //[dom, plugindom, contentdom]
    static textFragmentHandlers = new Map<string, (arg: Record<string, string>) => [HTMLElement, HTMLElement | undefined, HTMLElement]>();
    static leafFragmentHandlers = new Map<string, (arg: Record<string, string>) => [HTMLElement, HTMLElement | undefined, HTMLElement]>();
    static blockFragmentHandlers = new Map<string, (arg: Record<string, string>) => [HTMLElement, HTMLElement | undefined, HTMLElement]>();

    constructor(public node: PMNode, public outerView: EditorView, public getPos: () => number | undefined) {
        let dview: Map<string, (arg: Record<string, string>) => [HTMLElement, HTMLElement | undefined, HTMLElement]>;

        if(node.type.name == "markdown-leaf-directive") {
            dview = DirectiveView.leafFragmentHandlers;
        } else if (node.type.name == "markdown-block-directive") {
            dview = DirectiveView.blockFragmentHandlers;
        } else 
            dview = DirectiveView.textFragmentHandlers


        let res = dview.get(node.attrs.name)?.
            call(null, { name: node.attrs.name, type: node.attrs.type, ...node.attrs.attrs })
            ?? this.createFallback(node);

        this.dom = res[0];
        this.dom.classList.add('md-directive-container', 'plugin');

        if(res[1]) {
            this.pluginDOM = res[1];
            this.dom.appendChild(this.pluginDOM);
        }

        this.contentDOM = res[2];
        this.dom.appendChild(this.contentDOM);
    }

    createFallback(node: PMNode): [HTMLElement, HTMLElement, HTMLElement] {
        let res = document.createElement('span');
        let mesg = res.appendChild(document.createElement('span'));
        mesg.textContent = `This view ({type: container, name: ${node.attrs.name}}) is not handled properly, maybe a plugin is missing?\n`;
        mesg.contentEditable = 'false'
        return [document.createElement('div'), res, document.createElement('span')];
    }

    static addFragmentHandlers(type: 'leaf' | 'text' | 'block', name: string, func: (arg: Record<string, string>) => [HTMLElement, HTMLElement | undefined, HTMLElement]) {
        if(type == 'leaf')
            DirectiveView.leafFragmentHandlers.set(name, func);
        else if(type == 'text')
            DirectiveView.textFragmentHandlers.set(name, func);
        else if(type == 'block')
            DirectiveView.blockFragmentHandlers.set(name, func);
    }

    static clearFragmentHandlers() {
        DirectiveView.blockFragmentHandlers.clear();
        DirectiveView.leafFragmentHandlers.clear();
        DirectiveView.textFragmentHandlers.clear();
    }
}