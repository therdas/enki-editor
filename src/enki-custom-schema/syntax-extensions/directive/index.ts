import { Extension } from "prosemirror-unified";
import { ContainerDirectiveExtension, ContainerDirectiveView } from "./container-directive-extension"
import { LeafDirectiveExtension, LeafDirectiveView } from "./leaf-directive-extension";
import { TextDirectiveExtension, TextDirectiveView } from "./text-directive-extension";

export { ContainerDirectiveExtension, ContainerDirectiveView } from "./container-directive-extension"
export { LeafDirectiveExtension, LeafDirectiveView } from "./leaf-directive-extension"
export { TextDirectiveExtension, TextDirectiveView } from "./text-directive-extension"

export class DirectiveExtension extends Extension {
    override dependencies(): Array<Extension> {
        return [
            new ContainerDirectiveExtension,
            new LeafDirectiveExtension,
            new TextDirectiveExtension
        ]
    }
}

// 0: Container, 1: PluginDom, 2: ContentDom
export function setFragmentHandler(
    opts: {
        container?: [{ name: string, func: ( args: Record<string, string> ) => [ HTMLElement, HTMLElement, HTMLElement ] }] ,
        leaf?: [{ name: string, func: ( args: Record<string, string> ) => [ HTMLElement, HTMLElement, HTMLElement ] }] ,
        text?: [{ name: string, func: ( args: Record<string, string> ) => [ HTMLElement, HTMLElement, HTMLElement ] }] ,
    },
    clear: boolean = false
) {
    if(clear) {
        ContainerDirectiveView.clearFragmentHandlers();
        LeafDirectiveView.clearFragmentHandlers();
        TextDirectiveView.clearFragmentHandlers();
    }
    
    if(opts.container !== undefined)
        for(let i of opts.container){
            ContainerDirectiveView.addFragmentHandlers(i.name, i.func);
        }

    if(opts.leaf !== undefined)
        for(let i of opts.leaf){
            LeafDirectiveView.addFragmentHandlers(i.name, i.func);
        }
    
    if(opts.text !== undefined)
        for(let i of opts.text){
            TextDirectiveView.addFragmentHandlers(i.name, i.func);
        }
}