import { Extension } from 'prosemirror-unified';
import { remarkTagged} from './remarkTagged.js';
import { Processor } from 'unified';
import { Node } from 'unist';
import { buildUnifiedExtension } from '../BuildExtension';

export class EFMTagExtension extends Extension {
    public override unifiedInitializationHook(processor: Processor<Node, Node, Node, Node, string>): Processor<Node, Node, Node, Node, string> {
        return processor.use(remarkTagged);
    }
} 