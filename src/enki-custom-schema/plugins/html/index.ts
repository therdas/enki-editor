import { Node, Position } from "unist";
import { visitParents } from "unist-util-visit-parents"
import { Check, Test, convert } from "unist-util-is";
import { Parent } from "unist";
import { Html, Paragraph } from "mdast";
import { html } from "@codemirror/lang-html";
import { findAllAfter } from "unist-util-find-all-after";
import findAllBetween from "unist-util-find-all-between";
import { remove } from "unist-util-remove";
import { visit } from "unist-util-visit";

export function remarkFixRootHTML() {
  return function (tree: Node) {
    const problemNodes: Array<[Node, Node]> = [];

    visitParents(tree, 'html', function (node: Node, ancestors: Array<Node>) {
      const ancestor = ancestors[ancestors.length - 1];

      // Special case, HTML element in topmost layer
      if (ancestor.type != "paragraph") {
        problemNodes.push([ancestor, node]);
      }
    });

    for (let pair of problemNodes) {
      let node = pair[1];

      const htmlNode: Html = {
        type: "html",
        value: (<Html>node).value,
        position: node.position,
      }

      node.type = "paragraph",
        (<Parent>node).children = [htmlNode];
    }
  }
}
/**
 * Checks for HTML-span nodes that contain a starting tag. In case there are any ending tags with the same tag name,
 * 
 * @returns 
 */
export function remarkCombineHTMLTagPairs() {
  return function (tree: Node) {
    const htmlNodes: Array<[Html, Node]> = [];

    visitParents(tree, 'html', function (node: Html, ancestors: Array<Node>) {
      if (checkIfFlow(node.value)) {
        htmlNodes.push([node, ancestors[ancestors.length - 1]])
      }
    })

    let currentIndex = 0;
    let currentName = nodeNameFromHtmlString(htmlNodes[currentIndex][0].value);
    let currentNode = htmlNodes[currentIndex][1];

    for (let i = 1; i < htmlNodes.length; ++i) {

      let name = nodeNameFromHtmlString(htmlNodes[i][0].value);

      if (currentName === name && isClosing(htmlNodes[i][0].value)) {
        const lineFrom = currentNode.position?.start

        let stringForm: string = "";
        let secondNode: Node | undefined;
        let firstNodeInRange = true;

        visit(tree, function (node: Node) {
          return isBetween(node.position!.start.offset!, node.position!.end.offset!, currentNode.position!.start.offset!, htmlNodes[i][0].position!.end.offset!);
        }, function (node: Node) {
          if (isLiteral(node))
            stringForm += node.value;
        })

        remove(tree, function (node, index, parent) {
          if(isBetween(node.position!.start.offset!, node.position!.end.offset!, currentNode.position!.end.offset!, htmlNodes[i][0].position!.end.offset!)) {
            return true;
          } else {
            return false;
          }
        })

        const ref: Html = <Html>currentNode;
        ref.value = stringForm;

        currentIndex = i + 1;
        currentName = nodeNameFromHtmlString(htmlNodes[currentIndex][0].value);
        currentNode = htmlNodes[currentIndex][0];
      } else {
      }
    }
  }
}

function hasOffset(position: Position) { return 'offset' in position}

function isBetween(checkStart: number, checkEnd: number, from: number, to: number) {
    return from <= checkStart && checkEnd <= to;

}
// function isBetween(check: Position, from: Position, to: Position, startOpen: boolean = false, endOpen: boolean = false) {
  

//   return (from.start.line <= check.start.line) && (check.end.line <= to.end.line) &&
//     (from.start.column <= check.start.column) && (check.end.column <= to.end.column);
// }

function isLiteral(node: Node) {
  return 'value' in node;
}

function isClosing(html: string) { return html.charAt(1) === "/" }
function isContainer(html: string) { return ['input', 'base', 'link', 'meta', 'hr', 'br', 'wbr', 'source', 'img', 'embed', 'track', 'area', 'col'].indexOf(html) === -1 }

function nodeNameFromHtmlString(html: string) {
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