import type { Node } from "unist";

export function isBetween(checkStart: number, checkEnd: number, from: number, to: number) {
    return from <= checkStart && checkEnd <= to;

}
// function isBetween(check: Position, from: Position, to: Position, startOpen: boolean = false, endOpen: boolean = false) {
  

//   return (from.start.line <= check.start.line) && (check.end.line <= to.end.line) &&
//     (from.start.column <= check.start.column) && (check.end.column <= to.end.column);
// }

export function isLiteral(node: Node) {
  return 'value' in node;
}

export function isClosing(html: string) { return html.charAt(1) === "/" }

export function nodeNameFromHtmlString(html: string) {
  // Check for closing first
  const closing = html.charAt(1) == "/";

  // We can't directly take [-1] as the index as there might be attributes that we _need_
  // to account for. Attributes must start after a space, so check for that.
  const len = html.indexOf(" ") !== -1 ? html.indexOf(" ") : html.indexOf(">");

  return html.slice(!closing ? 1 : 2, len);
}

export function checkIfFlow(html: string): {
  isFlow: boolean,
  tag?: string,
  type?: 'opening' | 'closing' | 'other'
} {
  // Check if string starts with '<', ends with '>' and has only one of each tag.
  const single = html[0] == "<" && (html.match(/</g) || []).length == 1 &&
    html[html.length - 1] == ">" && (html.match(/>/g) || []).length == 1;

  // Given that the node is a single tag (flow), we can assume it to
  // be well formed. We just need to check for the type of node it is.
  const comment = single && (html.slice(1, 3) === "--");
  const closing = single && (html[1] == "/");
  const processing = single && (html[1] == "?");
  const declaration = single && (html[1] == "!");
  const CDATA = single && (html.slice(1, 9) === "![CDATA[");


  // We can use a simple extraction of the string from [1, <first occurence of a space character>].
  if (comment || processing || declaration || CDATA) {
    return {
      isFlow: true,
      tag: undefined,
      type: 'other'
    }
  } else if (single) {
    const close = Math.min(html.indexOf(' '), html.indexOf(">"), html.indexOf('/'));
    const tagName = html.slice(closing ? 2 : 1, close);
    return {
      isFlow: true,
      tag: tagName,
      type: closing ? 'opening' : 'closing',
    }
  } else return {
    isFlow: false,
    tag: undefined,
    type: undefined
  }
}