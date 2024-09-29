import { Node } from "unist";
import { visit } from "unist-util-visit";

export default function remarkHtmlFlow() {
    return function (tree: Node) {
        console.log("I am at ", tree);
    }
}