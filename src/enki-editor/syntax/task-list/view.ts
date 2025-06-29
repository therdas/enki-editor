import {
    type Node as ProseMirrorNode,
} from "prosemirror-model";
import type {
    EditorView,
    NodeView,
} from "prosemirror-view";

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