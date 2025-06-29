import { Extension } from "prosemirror-unified";
import { ContainerDirectiveExtension } from "./container-extension";
import { LeafDirectiveExtension } from "./leaf-extension";
import { TextDirectiveExtension } from "./text-extension";

export {
    LeafDirectiveExtension,
    TextDirectiveExtension,
    ContainerDirectiveExtension
}

export class EFMDirectiveExtension extends Extension {
    public override dependencies(): Array<Extension> {
        return [
            new ContainerDirectiveExtension(),
            new LeafDirectiveExtension(),
            new TextDirectiveExtension(),
        ]
    }
}