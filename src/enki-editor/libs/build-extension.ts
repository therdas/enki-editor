import type { Extension as FromMarkdownExtension } from "mdast-util-from-markdown";
import type { Options as ToMarkdownExtension } from "mdast-util-to-markdown";
import type { Extension as MicromarkExtension } from "micromark-util-types";
import type { Processor } from "unified";

export function buildUnifiedExtension(
  micromarkExtensions: Array<MicromarkExtension>,
  fromMarkdownExtensions: Array<FromMarkdownExtension>,
  toMarkdownExtensions: Array<ToMarkdownExtension>,
): () => void {
  return function (this: Processor) {
    const data = this.data();
    /*
        Remark uses mdast-util-{from,to}-markdown internally, these
        fields are present when a processor is instantiated by remark
        and are used by us to plug into the parser directly.
    */

    data.micromarkExtensions ??= [];
    (data.micromarkExtensions as Array<MicromarkExtension>).push(...micromarkExtensions);

    data.fromMarkdownExtensions ??= [];
    (data.fromMarkdownExtensions as Array<FromMarkdownExtension>).push(...fromMarkdownExtensions);

    data.toMarkdownExtensions ??= [];
    (data.toMarkdownExtensions as Array<ToMarkdownExtension>).push(...toMarkdownExtensions);
  };
}