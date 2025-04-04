import { Html, Text } from "mdast";
import { NodeSpec, Node as PMNode, Schema } from "prosemirror-model";
import { NodeExtension } from "prosemirror-unified";
import { remarkFixRootHTML, remarkCombineHTMLTagPairs }  from "../../plugins/html";
import { Processor } from "unified";
import { Node } from "unist";

export class HtmlExtension extends NodeExtension <Html> {
    proseMirrorNodeName(): string {
        return "html"
    }

    unistNodeName(): "html" {
        return 'html';
    }

    proseMirrorNodeSpec(): NodeSpec | null {
        return {
            content: "text*",
            group: "inline",
            inline: true,
            code: true,
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