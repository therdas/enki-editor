import { Node as UnistNode } from "unist";
import { NodeSpec, Node as PMNode, Schema } from "prosemirror-model";
import { NodeExtension } from "prosemirror-unified";
import { ContainerDirective, } from "mdast-util-directive"
import { Processor } from "unified";
import remarkDirective from "remark-directive";
import { BlockContent } from "mdast";
import { EditorView, NodeView } from "prosemirror-view";

export class ContainerDirectiveView implements NodeView {
    dom: HTMLElement;
    contentDOM: HTMLElement;
    pluginDOM: HTMLElement;         // Element wrapping around contentDOM
    static fragmentHandlers = new Map<string, (arg: Record<string, string>) => [HTMLElement, HTMLElement, HTMLElement]>();

    constructor(public node: PMNode, public outerView: EditorView, public getPos: () => number | undefined) {
        let res = ContainerDirectiveView.fragmentHandlers.get(node.attrs.name)?.
            call(null, { name: node.attrs.name, type: node.attrs.type, ...node.attrs.attrs })
            ?? this.createFallback(node);

        this.dom = res[0];
        this.dom.classList.add('md-directive-container', 'plugin');

        this.pluginDOM = res[1];
        this.dom.appendChild(this.pluginDOM);

        this.contentDOM = res[2];
        this.dom.appendChild(this.contentDOM);
    }

    createFallback(node: PMNode): [HTMLElement, HTMLElement, HTMLElement] {
        let res = document.createElement('div');
        let mesg = res.appendChild(document.createElement('div'));
        mesg.textContent = `This view ({type: container, name: ${node.attrs.name}}) is not handled properly, maybe a plugin is missing?\n`;
        mesg.contentEditable = 'false'
        return [document.createElement('div'), res, document.createElement('div')];
    }

    static addFragmentHandlers(name: string, func: (arg: Record<string, string>) => [HTMLElement, HTMLElement, HTMLElement]) {
        ContainerDirectiveView.fragmentHandlers.set(name, func);
    }

    static clearFragmentHandlers() {
        ContainerDirectiveView.fragmentHandlers.clear();
    }
}

export class ContainerDirectiveExtension extends NodeExtension
    <ContainerDirective> {
    proseMirrorNodeName(): 'markdown-block-directive' {
        return 'markdown-block-directive';
    }
    unistNodeName(): "containerDirective" {
        return "containerDirective";
    }

    proseMirrorNodeSpec(): NodeSpec | null {
        return {
            attrs: {
                name: { default: null },
                type: { default: null },
                attrs: { default: null },
                value: { default: null }
            },
            content: "block block*",
            group: "block",
            inline: false,
            marks: "",
            toDOM: (node: PMNode) => ["fragment", {
                "data-name": node.attrs.name,
                "data-type": node.attrs.type,
                "data-attrs": node.attrs.attrs,
                "data-value": node.attrs.value,
            }, 0],
            parseDOM: [
                {
                    getAttrs(dom) {
                        return {
                            "data-name": dom.getAttribute("data-name"),
                            "data-type": dom.getAttribute("data-type"),
                            "data-attrs": dom.getAttribute("data-attrs"),
                            "data-value": dom.getAttribute("data-value"),
                        }
                    },
                    tag: "fragment"
                },
            ]
        }
    }
    proseMirrorNodeToUnistNodes(node: PMNode, convertedChildren: Array<UnistNode>): ContainerDirective[] {
        return [
            {
                type: node.attrs.type,
                name: node.attrs.name,
                attributes: node.attrs.attrs,
                children: convertedChildren as BlockContent[],
            }
        ]
    }

    unistNodeToProseMirrorNodes(node: ContainerDirective, schema: Schema<string, string>, convertedChildren: Array<PMNode>): Array<PMNode> {
        let res = schema.nodes[this.proseMirrorNodeName()].createAndFill(
            {
                name: node.name,
                type: node.type,
                attrs: node.attributes,
            },
            convertedChildren,
        )
        return res ? [res] : [];
    }

    unifiedInitializationHook(processor: Processor<UnistNode, UnistNode, UnistNode, UnistNode, string>): Processor<UnistNode, UnistNode, UnistNode, UnistNode, string> {
        return processor.use(remarkDirective);
    }
}