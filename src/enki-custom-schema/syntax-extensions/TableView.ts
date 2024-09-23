import { Node as PMNode } from 'prosemirror-model';
import { Decoration, DecorationSet, NodeView } from 'prosemirror-view';
import { updateColumnsOnResize } from 'prosemirror-tables';
import { EditorState, Plugin, PluginKey } from 'prosemirror-state';

interface CellAttrs {
    colspan: number;
    rowspan: number;
    colwidth: number[] | null;
}

/**
 * @public
 */
export class TableView implements NodeView {
  public dom: HTMLDivElement;
  public table: HTMLTableElement;
  public colgroup: HTMLTableColElement;
  public contentDOM: HTMLTableSectionElement;

  constructor(public node: PMNode, public cellMinWidth: number) {
    this.dom = document.createElement('div');
    this.dom.className = 'tableWrapper';
    this.table = this.dom.appendChild(document.createElement('table'));
    this.colgroup = this.table.appendChild(document.createElement('colgroup'));
    updateColumnsOnResize(node, this.colgroup, this.table, cellMinWidth);
    this.contentDOM = this.table.appendChild(document.createElement('tbody'));
    updateColumnAlignments(node, this.dom);
  }

  update(node: PMNode): boolean {
    if (node.type != this.node.type) return false;
    this.node = node;
    updateColumnsOnResize(node, this.colgroup, this.table, this.cellMinWidth);
    updateColumnAlignments(node, this.dom);
    return true;
  }

  ignoreMutation(record: MutationRecord): boolean {
    return (
      record.type == 'attributes' &&
      (record.target == this.table || this.colgroup.contains(record.target))
    );
  }
}

export enum ColumnAlignment {
    Left = "left",
    Right = "right",
    Center = "center",
    Null = "null"
}

function parseStringAlignment(alignment: string): ColumnAlignment[] {
  if(alignment.slice(0,1) != "|" || alignment.slice(-1) != "|")
    return [];
  const tokens = alignment.slice(1, -1).split('|');
  const alignments = [];
  for(let i of tokens) {
    if(i == "left") alignments.push(ColumnAlignment.Left);
    else if(i == "right") alignments.push(ColumnAlignment.Right);
    else if(i == "center") alignments.push(ColumnAlignment.Center);
    else alignments.push(ColumnAlignment.Null);
  }
  return alignments;
}

const createdTableAlignmentClasses = {
  left: new Set<number>(),
  right: new Set<number>(),
  center: new Set<number>(),
}

export function updateColumnAlignments(
  node: PMNode,
  dom: HTMLDivElement,
) {
  let alignments = parseStringAlignment(node.attrs["align"]);
  
  const styleSheet = document.styleSheets[0];
  if(!styleSheet) return;
  for(let i = 0; i < alignments.length; ++i) {
    const col = i + 1;
    const alignment = alignments[i];

    if(alignment == "null") continue;

    const alignmentClass = createdTableAlignmentClasses[`${alignment}`];

    let created = alignmentClass.has(col);
    if(!created) {
      styleSheet.insertRule(`.pm-table-align-${alignment}-col-${col} > table > tbody > tr > td:nth-child(${i+1}) {text-align: ${alignments[i]}}`);
      alignmentClass.add(col);
    }

    dom.classList.add(`pm-table-align-${alignment}-col-${col}`);
  }
}