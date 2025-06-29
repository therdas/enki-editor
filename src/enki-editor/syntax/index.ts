import { 
    BlockquoteExtension, 
    BreakExtension, 
    DefinitionExtension, 
    ExtendedAutolinkExtension, 
    HeadingExtension, 
    HorizontalRuleExtension, 
    ImageExtension, 
    ImageReferenceExtension, 
    InlineCodeExtension, 
    LinkExtension, 
    LinkReferenceExtension, 
    ListItemExtension, 
    OrderedListExtension, 
    ParagraphExtension, 
    RootExtension, 
    StrikethroughExtension, 
    TextExtension, 
    UnorderedListExtension 
} from "prosemirror-remark";
import { Extension } from "prosemirror-unified";
import { BoldExtension } from "./bold-extension";
import { CodeBlockExtension } from "./code/index";
import { ItalicExtension } from "./italic-extension";
import type { Processor } from "unified";
import type { Node } from "unist";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify"
import type { Node as UnistNode } from "unist"
import { EFMTableExtension } from "./table/index";
import { EFMTaskListExtension } from "./task-list/index";
import { WikiLinkItemExtension } from "./wiki-link-extension";
import { EFMDirectiveExtension } from "./directive/index";
import { TaggableExtension } from "./tag-extension";
import { HtmlExtension } from "./html/index";
import { EFMMathExtension } from "./math/index";

export class EFMExtension extends Extension {
    public override dependencies(): Array<Extension> {
        return [
            new RootExtension(),
            new ParagraphExtension(),
            new BlockquoteExtension(),
            new BoldExtension(),
            new BreakExtension(),
            new InlineCodeExtension(),
            new CodeBlockExtension(),
            new DefinitionExtension(),
            new HeadingExtension(),
            new HorizontalRuleExtension(),
            new ImageExtension(),
            new ImageReferenceExtension(),
            new ItalicExtension(),
            new LinkExtension(),
            new LinkReferenceExtension(),
            new ListItemExtension(),
            new OrderedListExtension(),

            new TextExtension(),
            new UnorderedListExtension(),

            // Extended EFM
            new ExtendedAutolinkExtension(),
            new StrikethroughExtension(),
            new EFMTableExtension(),
            new EFMTaskListExtension(),
            new WikiLinkItemExtension(),
            new EFMDirectiveExtension(),
            new TaggableExtension(),
            new HtmlExtension(),
            new EFMMathExtension(),
        ]
    }

    public override unifiedInitializationHook(processor: Processor<Node, Node, Node, Node, string>): Processor<Node, Node, Node, Node, string> {
        return processor.use(remarkParse).use(remarkStringify, {
            fences: true,
            listItemIndent: "one",
            resourceLink: true,
            rule: "-",
        }) as unknown as Processor<
            Node,
            UnistNode,
            UnistNode,
            UnistNode,
            string
        >;
    }
}