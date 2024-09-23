import { Extension } from "prosemirror-unified";
import { TableCellExtension } from "./TableCell.ts";
import { TableRowExtension } from "./TableRow.ts";
import { TableExtension } from "./Table.ts";
import { TableHeaderExtension } from "./TableHeader.ts";

export {
    TableCellExtension,
    TableExtension,
    TableRowExtension,
    TableHeaderExtension
}

export class GFMTableExtension extends Extension {
    public override dependencies(): Array<Extension> {
        return [
            new TableExtension(),
            new TableRowExtension(),
            new TableCellExtension(),
            new TableHeaderExtension()
        ];
    }
}