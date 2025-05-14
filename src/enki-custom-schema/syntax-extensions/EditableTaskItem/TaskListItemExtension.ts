
import type { BlockContent, DefinitionContent, ListItem } from "mdast";
import {
  type DOMOutputSpec,
  type NodeSpec,
  type Node as ProseMirrorNode,
  type Schema,
} from "prosemirror-model";
import { TextSelection, type Command } from "prosemirror-state";
import type {
  EditorView,
  NodeView,
  NodeViewConstructor,
} from "prosemirror-view";
import type { Processor } from "unified";
import type { Node as UnistNode } from "unist";

import {
  gfmTaskListItemFromMarkdown,
  gfmTaskListItemToMarkdown,
} from "mdast-util-gfm-task-list-item";
import { gfmTaskListItem } from "micromark-extension-gfm-task-list-item";
import { InputRule } from "prosemirror-inputrules";
import { createProseMirrorNode, NodeExtension } from "prosemirror-unified";

import { buildUnifiedExtension } from "../BuildExtension";

import {
  liftListItem,
  sinkListItem,
  splitListItem,
} from "prosemirror-schema-list";

export class TaskListItemView implements NodeView {
  public readonly contentDOM: HTMLElement;
  public readonly dom: HTMLElement;

  public constructor(
    node: ProseMirrorNode,
    view: EditorView,
    getPos: () => number | undefined,
  ) {
    const checkbox = document.createElement("input");
    checkbox.setAttribute("type", "checkbox");
    checkbox.setAttribute("style", "cursor: pointer;");
    if (node.attrs["checked"] === true) {
      checkbox.setAttribute("checked", "checked");
    }
    checkbox.addEventListener("click", (e) => {
      const pos = getPos();
      if (pos === undefined) {
        return;
      }
      e.preventDefault();
      view.dispatch(
        view.state.tr.setNodeAttribute(
          pos,
          "checked",
          !(node.attrs["checked"] as boolean),
        ),
      );
    });

    const checkboxContainer = document.createElement("span");
    checkboxContainer.setAttribute("contenteditable", "false");
    checkboxContainer.setAttribute("style", "display: block; position: absolute; left: 0 px");
    checkboxContainer.appendChild(checkbox);

    this.contentDOM = document.createElement("p");
    this.contentDOM.setAttribute("style", "position: relative; left: 30px; ");

    this.dom = document.createElement("li");
    this.dom.setAttribute(
      "style",
      "position: relative;display: block; margin-left: -30px;",
    );
    this.dom.appendChild(checkboxContainer);
    this.dom.appendChild(this.contentDOM);
  }

  // eslint-disable-next-line @typescript-eslint/class-methods-use-this -- Inherited from the NodeView interface
  public stopEvent(): boolean {
    return true;
  }
}

/**
 * @public
 */
export class TaskListItemExtension extends NodeExtension<ListItem> {
  public override proseMirrorInputRules(
    proseMirrorSchema: Schema<string, string>,
  ): Array<InputRule> {
    return [
      new InputRule(/^\[([x\s]?)\][\s\S]$/u, (state, match, start) => {
        const wrappingNode = state.doc.resolve(start).node(-1);
        if (wrappingNode.type.name !== "regular_list_item") {
          return null;
        }

        let transaction = state.tr;
        transaction.replaceRangeWith(
          start - 2,
          start + wrappingNode.nodeSize,
          proseMirrorSchema.nodes[this.proseMirrorNodeName()].create(
            { checked: match[1] === "x" },
            wrappingNode.content.cut(3 + match[1].length)
          )
        )
        transaction.setSelection(new TextSelection(transaction.doc.resolve(start)))
        return transaction;
      }),
    ];
  }

  public override proseMirrorKeymap(
    proseMirrorSchema: Schema<string, string>,
  ): Record<string, Command> {
    const nodeType = proseMirrorSchema.nodes[this.proseMirrorNodeName()];
    return {
      Enter: splitListItem(nodeType),
      "Shift-Tab": liftListItem(nodeType),
      Tab: sinkListItem(nodeType),
    };
  }

  public override proseMirrorNodeName(): string {
    return "task_list_item";
  }

  public override proseMirrorNodeSpec(): NodeSpec {
    return {
      attrs: { checked: { default: false } },
      content: "paragraph block*",
      defining: true,
      group: "list_item",
      parseDOM: [
        {
          getAttrs(dom: Node | string): false | { checked: boolean } {
            const checkbox = (dom as HTMLElement).firstChild;
            if (!(checkbox instanceof HTMLInputElement)) {
              return false;
            }
            return { checked: checkbox.checked };
          },
          tag: "li",
        },
      ],
      toDOM(_: ProseMirrorNode): DOMOutputSpec {
        return [
          "li",
          { style: "list-style-type: circle;" },            
          ["span", { class: 'en-gfm-tasklist-item' }, 0],
        ];
      },
    };
  }

  public override proseMirrorNodeToUnistNodes(
    node: ProseMirrorNode,
    convertedChildren: Array<BlockContent | DefinitionContent>,
  ): Array<ListItem> {
    return [
      {
        checked: node.attrs["checked"] as boolean,
        children: convertedChildren,
        type: this.unistNodeName(),
      },
    ];
  }

  public override proseMirrorNodeView(): NodeViewConstructor | null {
    return (node, view, getPos) => new TaskListItemView(node, view, getPos);
  }

  public override unifiedInitializationHook(
    processor: Processor<UnistNode, UnistNode, UnistNode, UnistNode, string>,
  ): Processor<UnistNode, UnistNode, UnistNode, UnistNode, string> {
    return processor.use(
      buildUnifiedExtension(
        [gfmTaskListItem()],
        [gfmTaskListItemFromMarkdown()],
        [gfmTaskListItemToMarkdown()],
      ),
    );
  }

  public override unistNodeName(): "listItem" {
    return "listItem";
  }

  public override unistNodeToProseMirrorNodes(
    node: ListItem,
    proseMirrorSchema: Schema<string, string>,
    convertedChildren: Array<ProseMirrorNode>,
  ): Array<ProseMirrorNode> {
    return createProseMirrorNode(
      this.proseMirrorNodeName(),
      proseMirrorSchema,
      convertedChildren,
      { checked: node.checked },
    );
  }

  public override unistToProseMirrorTest(node: UnistNode): boolean {
    return (
      node.type === this.unistNodeName() &&
      "checked" in node &&
      typeof node.checked === "boolean"
    );
  }
}