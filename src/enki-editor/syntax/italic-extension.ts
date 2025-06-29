import { InputRule } from "prosemirror-inputrules";
import { Schema } from "prosemirror-model";
import { ItalicExtension as PMUItalicExtension } from "prosemirror-remark";
// import { MarkInputRule } from "prosemirror-unified";

export class ItalicExtension extends PMUItalicExtension {
    public override proseMirrorInputRules(
        proseMirrorSchema: Schema<string, string>
    ): Array<InputRule> {
        return [
            new InputRule(
                /(?<!\*)\*([^\s\*](?:[^\*]*[^\s\*])?)\*[^\*]$/u,
                (state, match, start, end) => {
                    return state.tr.addMark(start, end-1, proseMirrorSchema.marks[this.proseMirrorMarkName()].create())
                        .deleteRange(end-1, end)
                        .deleteRange(start, start + 1)
                        .removeStoredMark(proseMirrorSchema.marks[this.proseMirrorMarkName()])
                        .insertText(match[0].slice(-1), end-2);
                }
            ),
            new InputRule(
                /(?<!_)_([^\s_](?:[^_]*[^\s_])?)_[^_]$/u,
                (state, match, start, end) => {
                    return state.tr.addMark(start, end-1, proseMirrorSchema.marks[this.proseMirrorMarkName()].create())
                        .deleteRange(end-1, end)
                        .deleteRange(start, start + 1)
                        .removeStoredMark(proseMirrorSchema.marks[this.proseMirrorMarkName()])
                        .insertText(match[0].slice(-1), end-2);
                }
            )
            // new MarkInputRule(
            //     /(?<!\*)\*([^\s\*](?:[^\*]*[^\s\*])?)\*[^\*]$/u,
            //     proseMirrorSchema.marks[this.proseMirrorMarkName()],
            // ),
            // new MarkInputRule(
            //     /(?<!_)_([^\s_](?:.*[^\s])?)_([^_])$/u,
            //     proseMirrorSchema.marks[this.proseMirrorMarkName()],
            // ),
        ];
    }
}