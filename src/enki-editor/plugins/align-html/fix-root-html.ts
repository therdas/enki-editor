import type { Node } from "unist";
import { visitParents } from "unist-util-visit-parents"
import type { Parent } from "unist";
import type { Html } from "mdast";

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
