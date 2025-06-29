import type { PhrasingContent, TableCell } from "mdast";
import { 
    type NodeSpec,
    Node as ProseMirrorNode,
    Schema
} from "prosemirror-model";
import { TextSelection, type Command, type EditorState, type Transaction } from "prosemirror-state";

import { addColumnAfter, addRowAfter, goToNextCell, isInTable, selectedRect, tableNodes} from "prosemirror-tables";

import { createProseMirrorNode, NodeExtension } from "prosemirror-unified";

import { EditorView } from "prosemirror-view";

export function addRowAfterLast (state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView): boolean {
    if(!isInTable(state))
       return false;

    let rect = selectedRect(state);
    let table = rect.map;
    

    // Make new row if it is the last row
    if((rect.top + 1 == table.height) && dispatch && view) {
        addRowAfter(state, dispatch);
        moveToNextRow(view!.state, dispatch);
    }


    return true;
}

export function addColumnAfterLast (state: EditorState, dispatch?: (tr: Transaction) => void, view?: EditorView): boolean {
    if(!isInTable(state))
       return false;

    let rect = selectedRect(state);
    let table = rect.map;
    

    // Make new row if it is the last row
    if((rect.left + 1 == table.width) && dispatch && view) {
        addColumnAfter(state, dispatch);
    }

    return true;
}

export function moveToNextRow(state: EditorState, dispatch?: (tr: Transaction) => void, _?: EditorView): boolean {
    if(!isInTable(state))
        return false;

    let rect = selectedRect(state);


    let row = rect.top;
    let col = rect.left;
    let map = rect.map;

    if(row >= map.height - 1 || col >= map.width - 1)
        return false;

    const selStart = map.positionAt(row + 1, col - 1, rect.table) + rect.tableStart + 1; // +1 because we want to point _inside_ the cell.
    const $selStart = state.doc.resolve(selStart);
    const $selEnd = state.doc.resolve(($selStart?.pos ?? 0) + ($selStart?.nodeAfter?.nodeSize ?? 0))

    if(!$selStart) return false;


    if(dispatch) dispatch( state.tr.setSelection( new TextSelection( $selStart, $selEnd ) ).scrollIntoView() )

    return true;
}

export function nullCmd (_: EditorState, __?: (tr: Transaction) => void): boolean {
    return true;
}

export function composeCommands(...commands: readonly Command[]): Command{
    return function (state, dispatch, view) {
        for(let command of commands) {
            if(!view) return false;
            if(command(state, dispatch, view) == false) return false;
        }
        return true;
    }
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
            Enter: addRowAfterLast,
            "Shift-Enter": nullCmd,
            
        }
    }

    public override proseMirrorNodeName(): string {
        return "table_cell";
    }

    public override proseMirrorNodeSpec(): NodeSpec | null {

        const schema = tableNodes({
            tableGroup: "block",
            cellContent: "inline*",
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
        const res = createProseMirrorNode(
            this.proseMirrorNodeName(),
            schema,
            convertedChildren
        )
        return res;
    }
}

