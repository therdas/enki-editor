import type { PhrasingContent, TableCell } from "mdast";
import { 
    NodeSpec,
    Node as ProseMirrorNode,
    Schema
} from "prosemirror-model";
import { TextSelection, type Command, type EditorState, type Transaction } from "prosemirror-state";

import { addRowAfter, goToNextCell, isInTable, selectedRect, TableMap, tableNodes} from "prosemirror-tables";

import { createProseMirrorNode, NodeExtension } from "prosemirror-unified";

import { EditorView } from "prosemirror-view";

export function checkForLastCell (state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView): boolean {
    if(!isInTable(state))
       return false;

    let rect = selectedRect(state);
    let table = rect.map;
    
    console.log(rect.top, "===", table.height, rect.top===table.height)

    if(!view) return true;

    // Make new row if it is the last row

    if(rect.top + 1 == table.height){
        console.log("<>>",rect.top, rect.left, table.height, table.width);
        addRowAfter(view.state, dispatch);
        
        // If this happens, the references must be hydrated. Changes made to view.
    } 


    // Go to the same col in the next row
    const map = TableMap.get(view!.state!.doc!.resolve(rect.tableStart)!.node());
    console.log("GetMapped", map);
    const $cellStart = map.positionAt(rect.top+1, rect.left, rect.table) + rect.tableStart;
    const $res = view.state.doc.resolve($cellStart);
    const $from = $res.node(0).resolve($res.posAtIndex(0, $res.depth + 1) + 1)
    const offset = $from.nodeAfter?.nodeSize ?? 0;
    const $to = $from.node(0).resolve($from.pos + offset);

    dispatch!(state.tr.setSelection(new TextSelection($from, $to)).scrollIntoView())

    return true;
}

export function nullCmd (state: EditorState, dispatch?: (tr: Transaction) => void): boolean {
    return true;
}


export class TableCellExtension extends NodeExtension<
TableCell,
Record<"table_cell", unknown>
> {
    public override proseMirrorKeymap (
        _: Schema<string, string>,
    ): Record<string, Command> {
        return {
            Tab: goToNextCell(1),
            "Shift-Tab": goToNextCell(-1),
            Enter: checkForLastCell,
            "Shift-Enter": nullCmd
        }
    }

    public override proseMirrorNodeName(): string {
        return "table_cell";
    }

    public override proseMirrorNodeSpec(): NodeSpec | null {

        const schema = tableNodes({
            tableGroup: "block",
            cellContent: "inline+",
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
        }).table_cell;
        return schema;
    }

    public override proseMirrorNodeToUnistNodes(_node: ProseMirrorNode, 
        convertedChildren: Array<PhrasingContent>
    ): Array<TableCell> {
        return [{
            type: "tableCell",
            children: convertedChildren,
            data: _node.text
        }]
    }

    public override unistNodeName(): "tableCell" {
        return "tableCell"
    }

    public override unistNodeToProseMirrorNodes(
        _: TableCell, 
        schema: Schema<string, string>, 
        convertedChildren: Array<ProseMirrorNode>, 
        __ : Partial<Record<string, never>>
    ): Array<ProseMirrorNode> {
        // // If the fragment has only text node(s) - this needs to be fixed. One solution is to naively wrap entire fragment in paragraph blocks. This is what we'll do here
        // let container = schema.nodes["paragraph"].createAndFill(null, convertedChildren);
        // console.log("CONTAINED IN", container);
        const res = createProseMirrorNode(
            this.proseMirrorNodeName(),
            schema,
            convertedChildren
        )
        return res;
    }
}

