import type { Html, Text } from "mdast";
import { 
    DOMOutputSpec,
    NodeSpec,
    Node as ProseMirrorNode,
    Schema
} from "prosemirror-model";
import { TextExtension } from "prosemirror-remark";
import { Extension, NodeExtension } from "prosemirror-unified";
import { Processor } from "unified";
import { Node } from "unist";
import { remarkFixRootHTML, remarkCombineHTMLTagPairs }  from "../../plugins/html";

export class HtmlExtension extends NodeExtension<Html> {
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
            code: true
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
    ): Array<ProseMirrorNode> {
        let retnode = schema.nodes[this.proseMirrorNodeName()].createAndFill(null, schema.text(node.value));
        return (retnode !== null) ? [retnode] : [];
    }

    public override unifiedInitializationHook(processor: Processor<Node, Node, Node, Node, string>): Processor<Node, Node, Node, Node, string> {
        return processor.use(remarkFixRootHTML).use(remarkCombineHTMLTagPairs)
    }
}

