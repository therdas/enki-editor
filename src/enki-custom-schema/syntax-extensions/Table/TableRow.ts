import type { 
    RowContent, 
    TableRow 
} from "mdast";

import { 
    NodeSpec,
    Node as ProseMirrorNode,
    Schema
} from "prosemirror-model";

import { 
    createProseMirrorNode, 
    NodeExtension 
} from "prosemirror-unified";


export class TableRowExtension extends NodeExtension<TableRow> {
    public override proseMirrorNodeName(): string {
        return "table_row";
    }

    public override proseMirrorNodeSpec(): NodeSpec | null {
        return {
            content: '(table_cell)+',
            tableRole: 'row',
            parseDOM: [{ tag: 'tr' }],
            toDOM() {
              return ['tr', 0];
            },
            allowGapCursor: false,
        }
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
        return createProseMirrorNode(
            this.proseMirrorNodeName(),
            schema,
            convertedChildren,
        )
    }
}

