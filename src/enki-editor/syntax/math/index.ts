import { Extension } from "prosemirror-unified";
import { InlineMathExtension } from "./inline-math-extension";
import { BlockMathExtension } from "./block-math-extension";

export { InlineMathExtension } from "./inline-math-extension";
export { BlockMathExtension } from "./block-math-extension";

export class EFMMathExtension extends Extension {
    public override dependencies(): Array<Extension> {
        return [
            new InlineMathExtension(),
            new BlockMathExtension(),
        ]
    }
}