import { Extension } from "prosemirror-unified";
import { TableCellExtension } from "./Table/TableCell.ts";
import { TableRowExtension } from "./Table/TableRow.ts";
import { TableExtension } from "./Table/Table.ts";
import { HtmlInlayExtension } from "./Html/HtmlInlay.ts";

export {
    TableCellExtension,
    TableExtension,
    TableRowExtension,
}

export { HtmlInlayExtension }

export class GFMTableExtension extends Extension {
    public override dependencies(): Array<Extension> {
        return [
            new TableExtension(),
            new TableRowExtension(),
            new TableCellExtension(),
        ];
    }
}

export class MDHtmlInlayExtension extends Extension {
    public override dependencies(): Array<Extension> {
        return [
            new HtmlInlayExtension(),

        ]
    }
}