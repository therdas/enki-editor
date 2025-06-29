import { MarkType, Node, NodeType } from "prosemirror-model";
import { EditorState, Selection } from "prosemirror-state";

const hoist_to = new Map<string, string>([['table_cell', 'table'], ['table_row', 'table'], ['table_col', 'table'], ['paragraph', '^'], ['regular_list_item', '_list']])

type NodeRange = {
    node: Node,
    from: number,
    to: number,
}

export function findContainerParent(selection: Selection, state: EditorState) {
    let node = selection.$anchor.node();
    let type = node.type.name;
    let $anchor = selection.$anchor.pos < selection.$head.pos ? selection.$anchor : selection.$head;

    let hoistTo = hoist_to.get(type) ?? 'doc';
    let offset;
    // Selection can be -1 at beginning when editor is unfocussed
    do {
        offset = $anchor.pos - $anchor.parentOffset;
        if(offset <= 0) break;
        $anchor = state.doc.resolve(offset - 1);
        type = $anchor.node().type.name;
        

        // Check if we need to move the goalpost
        let check = hoist_to.get(type);
        if(check)
            hoistTo = check;

        // Special case for paragraph, hoist once and only once
        if(hoistTo == '^'){
            break;
        }
    } while(!type.endsWith(hoistTo) && $anchor.pos >= 0);
    
    if((type.endsWith(hoistTo)) && type !== 'doc')
        return $anchor;
    else
        return selection.$anchor.pos < selection.$head.pos ? selection.$anchor : selection.$head;
}

export function isNodeActive(state: EditorState, typeOrName: NodeType | string) : boolean {
    const { from, to, empty } = state.selection;
    const type = typeOrName instanceof NodeType ? typeOrName.name : typeOrName;

    const nodeRanges: NodeRange[] = []
    state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.isText) return;

        const relativeFrom = Math.max(from, pos);
        const relativeTo= Math.min(to, pos + node.nodeSize);

        nodeRanges.push({
            node, 
            from: relativeFrom,
            to: relativeTo
        })
    })

    const selectionRange = to - from;
    const matchedNodeRanges = nodeRanges
        .filter(nodeRange => {
            if(!type) return true;
            return type === nodeRange.node.type.name
        });
    
    if(empty) return !!matchedNodeRanges.length
    
    const range = matchedNodeRanges.reduce((sum, nodeRange) => sum + nodeRange.to - nodeRange.from, 0)

    return range >= selectionRange;        
}

export function isMarkActive(state: EditorState, typeOrName: MarkType | string) {
    const {empty} = state.selection;
    const type = typeof typeOrName === 'string' ? typeOrName : typeOrName.name;

    if(empty) {
        return !!(state.storedMarks || state.selection.$from.marks())
            .filter((mark) => type === mark.type.name)
            .find(mark => mark.type.name === type)
    } else return false;
}