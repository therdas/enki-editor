import { Node as UnistNode } from "unist";
import { NodeSpec, Node as PMNode, Schema } from "prosemirror-model";
import { NodeExtension } from "prosemirror-unified";
import { ContainerDirective,  } from "mdast-util-directive"
import { Processor } from "unified";
import remarkDirective from "remark-directive"; 
import { BlockContent } from "mdast";
import { EditorView, NodeView } from "prosemirror-view";

export const BlockDirectiveMap = new Map<string, (arg: PMNode) => HTMLElement>();

export class ContainerDirectiveView implements NodeView {
    dom: HTMLElement;
    contentDOM?: HTMLElement | null | undefined;
    pluginDOM?: HTMLElement | undefined;
    header?: HTMLElement;

    constructor(public node: PMNode, public outerView: EditorView, public getPos: () => number | undefined) {
        this.dom = document.createElement('div');
        this.dom.classList.add('md-directive', 'plugin');

        this.pluginDOM = BlockDirectiveMap.get(node.attrs.name)?.call(null, node) ?? this.createFallback(node);
        this.dom.appendChild(this.pluginDOM);
        this.contentDOM = this.dom.appendChild(document.createElement("div"));
    }

    createFallback(node: PMNode) {
        let res = document.createElement('div');
        let mesg = res.appendChild(document.createElement('div'));
        mesg.textContent = `This view is not handled properly, maybe a plugin is missing?\nType: ${node.attrs.type}, \nValue: ${node.attrs.value}`;
        mesg.contentEditable = 'false'
        return res;
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
    
    unistNodeToProseMirrorNodes(node: ContainerDirective, schema: Schema<string, string>, convertedChildren: Array<PMNode>, context: Partial<Record<string, never>>): Array<PMNode> {
        console.log("Converting ", convertedChildren);
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