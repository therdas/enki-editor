import type { RowContent, TableRow } from "mdast";
import { 
    NodeSpec,
    Node as ProseMirrorNode,
    Schema
} from "prosemirror-model";

import { tableNodes} from "prosemirror-tables";

import { createProseMirrorNode, NodeExtension } from "prosemirror-unified";


export class TableRowExtension extends NodeExtension<TableRow> {
    public override proseMirrorNodeName(): string {
        return "table_row";
    }

    public override proseMirrorNodeSpec(): NodeSpec | null {

        //TODO This is not the best way to do this. See if there's a better way.
        return tableNodes({
            tableGroup: "block",
            cellContent: "block+",
            cellAttributes: {
                background: {
                    default: null,
                    getFromDOM(dom) {
                        return dom.style.backgroundColor || null;
                    },
                    setDOMAttr(value, attrs) {
                        if(value)
                            attrs.style = (attrs.style || '') + `background-color: ${value}`;
                    },
                },
            },
        }).table_row;
    }

    public override proseMirrorNodeToUnistNodes(_node: ProseMirrorNode, 
        convertedChildren: Array<RowContent>
    ): Array<TableRow> {
        return [{
            type: "tableRow",
            children: convertedChildren,
        }]
    }

    public override unistNodeName(): "tableRow" {
        return "tableRow"
    }

    public override unistNodeToProseMirrorNodes(
        node: TableRow, 
        schema: Schema<string, string>, 
        convertedChildren: Array<ProseMirrorNode>, 
        context: Partial<Record<string, never>>
    ): Array<ProseMirrorNode> {
        console.log("@@>", node, schema, convertedChildren, context)
        return createProseMirrorNode(
            this.proseMirrorNodeName(),
            schema,
            convertedChildren,
        )
    }
}

