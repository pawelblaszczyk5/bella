import { useRef, useState } from "react";
import { Form, Label, TextArea, TextField } from "react-aria-components";

import { assert } from "@bella/assert";
import { accessibility, ring } from "@bella/design-system/styles/utilities";
import { mauve } from "@bella/design-system/theme/color.stylex";
import { spacing } from "@bella/design-system/theme/spacing.stylex";
import stylex from "@bella/stylex";

import type { TextMessagePartShape } from "#src/lib/collections.js";

const styles = stylex.create({
	textarea: {
		borderColor: mauve[7],
		borderStyle: "solid",
		borderWidth: 1,
		inlineSize: 680,
		maxInlineSize: "100%",
		paddingBlock: spacing[3],
		paddingInline: spacing[4],
		resize: "none",
	},
});

export const Composer = ({
	onSubmit,
}: Readonly<{ onSubmit: (userMessageText: TextMessagePartShape["data"]["text"]) => void }>) => {
	const formRef = useRef<HTMLFormElement>(null);

	const [messageContent, setMessageContent] = useState("");

	return (
		<Form
			onSubmit={(event) => {
				event.preventDefault();

				onSubmit(messageContent);
				setMessageContent("");
			}}
			ref={formRef}
		>
			<TextField
				onChange={(value) => {
					setMessageContent(value);
				}}
				value={messageContent}
				isRequired
			>
				<Label {...stylex.props(accessibility.srOnly)}>Message content to send</Label>
				<TextArea
					onKeyDown={(event) => {
						if (event.key !== "Enter" || event.shiftKey) {
							return;
						}

						assert(formRef.current, "Form must be rendered here");

						event.preventDefault();
						formRef.current.requestSubmit();
					}}
					rows={5}
					{...stylex.props(styles.textarea, ring.focus)}
				/>
			</TextField>
		</Form>
	);
};
