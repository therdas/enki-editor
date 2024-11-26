import { Extension } from "prosemirror-unified";
import { TableCellExtension } from "./Table/TableCell.ts";
import { TableRowExtension } from "./Table/TableRow.ts";
import { TableExtension } from "./Table/Table.ts";
import { HtmlExtension } from "./Html/HtmlExtension.ts";
import { ExtendedAutolinkExtension, MarkdownExtension, StrikethroughExtension } from "prosemirror-remark";
import { TaskListItemExtension } from "./EditableTaskItem/TaskListItemExtension.ts";

export {
    TableCellExtension,
    TableExtension,
    TableRowExtension,
}

export { HtmlExtension as HtmlInlayExtension }

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
            new HtmlExtension(),

        ]
    }
}

export class GFMEditableTasklistExtension extends Extension {
    public override dependencies(): Array<Extension> {
        return [
            new TaskListItemExtension()
        ]
    }
}

export class eGFMExtension extends Extension {
    public override dependencies(): Array<Extension> {
        return [
            new MarkdownExtension(),
            new ExtendedAutolinkExtension(),
            new StrikethroughExtension(),
        ]
    }
}