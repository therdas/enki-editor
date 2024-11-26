import { Node, Nodes, PhrasingContent } from "mdast";
import { findAndReplace, ReplaceFunction } from "mdast-util-find-and-replace";

const mention = "([a-z][0-9a-z\/]*)";

const flags = "gi";

export function remarkTagged (
    opts = {
        rules: [
            {
                marker: '@',
                rule: (content: string) => `/user/${content}`
            }, 
            {
                marker: '#',
                rule: (content: string) => `/tag/${content}`
            },
        ]
    }
) {
    // Construct rules
    let rules: Array<[RegExp, ReplaceFunction]> | undefined = undefined;
    for(let rule of opts.rules) {
        const regex = new RegExp(rule.marker + mention, flags);
        const replaceFunction = (text: string, value: string): PhrasingContent => {
            return {
                type: 'link',
                url: rule.rule(value),
                children: [
                    { type: 'text', value: value }
                ]
            }
        }
        if(rules === undefined)
            rules = [[regex, replaceFunction]];
        else
            rules.push([regex, replaceFunction])
    }

    const finalRules: Array<[RegExp, ReplaceFunction]> = rules!;

    return (tree: Node) => {
        // @ts-expect-error
        findAndReplace(tree, finalRules);
    }
}
