import { Extension } from "prosemirror-unified";
import { TableCellExtension } from "./Table/TableCell.ts";
import { TableRowExtension } from "./Table/TableRow.ts";
import { TableExtension } from "./Table/Table.ts";
import { HtmlExtension } from "./Html/HtmlExtension.ts";
import { BlockquoteExtension, BreakExtension, CodeBlockExtension, DefinitionExtension, ExtendedAutolinkExtension, HeadingExtension, HorizontalRuleExtension, ImageExtension, ImageReferenceExtension, InlineCodeExtension, LinkExtension, LinkReferenceExtension, ListItemExtension, MarkdownExtension, OrderedListExtension, ParagraphExtension, RootExtension, StrikethroughExtension, TextExtension, UnorderedListExtension } from "prosemirror-remark";
import { TaskListItemExtension } from "./EditableTaskItem/TaskListItemExtension.ts";
import { ItalicExtension } from "./italbold/ItalicsExtension.ts";
import { BoldExtension } from "./italbold/BoldExtension.ts";
import { Node as UnistNode } from "unist";
import { Processor } from "unified";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
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
            new ExtendedAutolinkExtension(),
            new StrikethroughExtension(),
        ]
    }
}

export class efmExtension extends Extension {
    public override dependencies(): Array<Extension> {
        return [
            new ParagraphExtension(),
            new BlockquoteExtension(),
            new BoldExtension(),
            new BreakExtension(),
            new CodeBlockExtension(),
            new DefinitionExtension(),
            new HeadingExtension(),
            new HorizontalRuleExtension(),
            new ImageExtension(),
            new ImageReferenceExtension(),
            new InlineCodeExtension(),
            new ItalicExtension(),
            new LinkExtension(),
            new LinkReferenceExtension(),
            new ListItemExtension(),
            new OrderedListExtension(),
            new RootExtension(),
            new TextExtension(),
            new UnorderedListExtension(),
        ]
    }

    public override unifiedInitializationHook(
        processor: Processor<UnistNode, UnistNode, UnistNode, UnistNode, string>,
      ): Processor<UnistNode, UnistNode, UnistNode, UnistNode, string> {
        return processor.use(remarkParse).use(remarkStringify, {
          fences: true,
          listItemIndent: "one",
          resourceLink: true,
          rule: "-",
        }) as unknown as Processor<
          UnistNode,
          UnistNode,
          UnistNode,
          UnistNode,
          string
        >;
      }
}