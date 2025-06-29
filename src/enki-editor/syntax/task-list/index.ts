import { Extension } from "prosemirror-unified";
import { TaskListItemExtension } from "./extension";

export { TaskListItemExtension } from "prosemirror-remark";

export class EFMTaskListExtension extends Extension {
    public override dependencies(): Array<Extension> {
        return [
            new TaskListItemExtension(),
        ]
    }
} 