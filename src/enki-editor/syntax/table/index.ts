import { columnResizing, TableView } from "prosemirror-tables";
import { Extension } from "prosemirror-unified";
import { TableExtension } from "./table-extension";
import { TableRowExtension } from "./table-row-extension";
import { TableCellExtension } from "./table-cell-extension";

export { TableCellExtension } from "./table-cell-extension";
export { TableExtension } from "./table-extension";
export { TableRowExtension } from "./table-row-extension";

// Use columnResizing({view: TableView}) to use this. Otherwise it'll show normal tables
export const resizableTable = columnResizing.bind({ View: TableView });

export class EFMTableExtension extends Extension{
    public override dependencies(): Array<Extension> {
        return [
            new TableExtension(),
            new TableRowExtension(),
            new TableCellExtension()
        ]
    }
}