import { Node as UnistNode } from "unist";
import { NodeSpec, Node as PMNode, Schema } from "prosemirror-model";
import { NodeExtension } from "prosemirror-unified";
import { TextDirective } from "mdast-util-directive"
import { Processor } from "unified";
import remarkDirective from "remark-directive"; 
import { PhrasingContent } from "mdast";
import { EditorView, NodeView } from "prosemirror-view";

export class TextDirectiveView implements NodeView {
    dom: HTMLElement;
    contentDOM?: HTMLElement | null | undefined;
    pluginDOM?: HTMLElement | undefined;
    header?: HTMLElement;
    static fragmentHandlers = new Map<string, (arg: Record<string, string>) => [HTMLElement, HTMLElement, HTMLElement]>();

    constructor(public node: PMNode, public outerView: EditorView, public getPos: () => number | undefined) {
        let res = TextDirectiveView.fragmentHandlers.get(node.attrs.name)?.call(null, {name: node.attrs.name, type: node.attrs.type, ...node.attrs.attrs}) ?? this.createFallback(node);
        
        this.dom = res[0];
        this.dom.classList.add('md-directive-container', 'plugin');
        
        this.pluginDOM = res[1];
        this.dom.appendChild(this.pluginDOM);

        this.contentDOM = res[2];
        this.dom.appendChild(this.contentDOM);
    }

    createFallback(node: PMNode) {
        let res = document.createElement('span');
        let mesg = res.appendChild(document.createElement('span'));
        mesg.textContent = `This view is not handled properly, maybe a plugin is missing?\nType: ${node.attrs.type}, \nAttributes: ${JSON.stringify(node.attrs.attrs)}`;
        mesg.contentEditable = 'false'
        return [document.createElement('div'), res, document.createElement('div')];
    }

    static addFragmentHandlers(name: string, func: (arg: Record<string, string>) => [HTMLElement, HTMLElement, HTMLElement]) {
        TextDirectiveView.fragmentHandlers.set(name, func);
    }

    static clearFragmentHandlers() {
        TextDirectiveView.fragmentHandlers.clear();
    }
}

export class TextDirectiveExtension extends NodeExtension 
<TextDirective> {
    proseMirrorNodeName(): 'markdown-text-directive' {
        return 'markdown-text-directive';
    }
    unistNodeName(): "textDirective" {
        return "textDirective";
    }

    proseMirrorNodeSpec(): NodeSpec | null {
        return {
            attrs: {
                name: { default: null },
                type: { default: null },
                attrs: { default: null }
            },
            content: "inline*",
            group: "inline",
            inline: true,
            toDOM: (node: PMNode) => [ "fragment", { 
                "data-name": node.attrs.name,
                "data-type": node.attrs.type,
                "data-attrs": node.attrs.attrs,
            }, 0],
            parseDOM: [
                {
                    getAttrs(dom) {
                        return {
                            "data-name": dom.getAttribute("data-name"),
                            "data-type": dom.getAttribute("data-type"),
                            "data-attrs": dom.getAttribute("data-attrs"),
                        }
                    },
                    tag: "fragment"
                }, 
            ]
        }
    }
    proseMirrorNodeToUnistNodes(node: PMNode, convertedChildren: Array<UnistNode>): TextDirective[] {
        return [
            {
                type: node.attrs.type,
                name: node.attrs.name,
                attributes: node.attrs.attrs,
                children: convertedChildren as PhrasingContent[],
            }
        ]
    }
    
    unistNodeToProseMirrorNodes(node: TextDirective, schema: Schema<string, string>, convertedChildren: Array<PMNode>, context: Partial<Record<string, never>>): Array<PMNode> {
        let res = schema.nodes[this.proseMirrorNodeName()].createAndFill(
            {
                name: node.name,
                type: node.type,
                attrs: node.attributes, 
            }, 
            convertedChildren
        )
        return res ? [res] : [];
    }

    unifiedInitializationHook(processor: Processor<UnistNode, UnistNode, UnistNode, UnistNode, string>): Processor<UnistNode, UnistNode, UnistNode, UnistNode, string> {
        return processor.use(remarkDirective);
    }
}