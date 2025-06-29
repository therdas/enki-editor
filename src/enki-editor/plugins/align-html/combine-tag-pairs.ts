import type { Node } from "unist";
import { visitParents } from "unist-util-visit-parents"
import type { Html } from "mdast";
import { remove } from "unist-util-remove";
import { visit } from "unist-util-visit";
import { checkIfFlow, isBetween, isClosing, isLiteral, nodeNameFromHtmlString } from "./utils";


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

    if(htmlNodes.length == 0) return;

    let currentIndex = 0;
    let currentName = nodeNameFromHtmlString(htmlNodes[currentIndex][0].value);
    let currentNode = htmlNodes[currentIndex][1];

    for (let i = 1; i < htmlNodes.length; ++i) {

      let name = nodeNameFromHtmlString(htmlNodes[i][0].value);

      if (currentName === name && isClosing(htmlNodes[i][0].value)) {

        let stringForm: string = "";

        visit(tree, function (node: Node) {
          return isBetween(node.position!.start.offset!, node.position!.end.offset!, currentNode.position!.start.offset!, htmlNodes[i][0].position!.end.offset!);
        }, function (node: Node) {
          if (isLiteral(node))
            stringForm += node.value;
        })

        remove(tree, function (node) {
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