import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { useDeferredValue } from "react";
import ReactMarkdown from "react-markdown";
import { Refractor, registerLanguage } from "react-refractor";
import bash from "refractor/bash";
import css from "refractor/css";
import go from "refractor/go";
import javascript from "refractor/javascript";
import jsx from "refractor/jsx";
import markup from "refractor/markup";
import markupTemplating from "refractor/markup-templating";
import php from "refractor/php";
import python from "refractor/python";
import rust from "refractor/rust";
import sql from "refractor/sql";
import tsx from "refractor/tsx";
import typescript from "refractor/typescript";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

import { typography } from "@bella/design-system/styles/typography";
import { mauve, violet } from "@bella/design-system/theme/color.stylex";
import { radii } from "@bella/design-system/theme/radii.stylex";
import { spacing } from "@bella/design-system/theme/spacing.stylex";
import { fontFamily, fontSize, fontWeight, lineHeight } from "@bella/design-system/theme/typography.stylex";
import stylex from "@bella/stylex";

const LANGUAGES = [tsx, bash, go, javascript, jsx, markupTemplating, markup, rust, python, php, typescript, sql, css];

LANGUAGES.forEach((language) => {
	registerLanguage(language);
});

const REGISTERED_LANGUAGES = new Set(
	LANGUAGES.flatMap((language) => [language.displayName, ...(language.aliases as Array<string>)]),
);

const highlightedCodeStyles = stylex.create({
	content: {
		display: "block",
		fontSize: fontSize[3],
		hyphens: "none",
		inlineSize: "100%",
		maxInlineSize: "100%",
		overflowX: "auto",
		overscrollBehaviorInline: "contain",
		paddingBlock: spacing[3],
		paddingInline: spacing[4],
		tabSize: 2,
		textAlign: "left",
		whiteSpace: "pre",
		wordBreak: "normal",
		wordSpacing: "normal",
		wordWrap: "normal",
	},
	inlineCode: { fontSize: fontSize[3] },
	languageInfo: { fontFamily: fontFamily.mono, fontSize: fontSize[3] },
	root: {
		borderColor: mauve[6],
		borderRadius: radii[4],
		borderStyle: "solid",
		borderWidth: 1,
		display: "grid",
		lineHeight: lineHeight[3],
		marginBlock: spacing[3],
		overflow: "hidden",
	},
	topBar: {
		alignItems: "center",
		borderBlockEndWidth: 1,
		borderColor: mauve[6],
		borderStyle: "solid",
		display: "flex",
		fontFamily: fontFamily.sans,
		justifyContent: "space-between",
		paddingBlock: spacing[3],
		paddingInline: spacing[4],
	},
});

const HighlightedCode = ({
	children,
	className,
}: Readonly<{ children?: ReactNode | undefined; className?: string | undefined; inline?: boolean | undefined }>) => {
	const match = className?.match(/language-(\w+)/u);
	const language = match ? match[1] : undefined;

	const deferredContent = useDeferredValue(children);

	if (!language) {
		return <code {...stylex.props(highlightedCodeStyles.inlineCode)}>{children}</code>;
	}

	if (typeof deferredContent !== "string") {
		return;
	}

	const isSupportedLanguage = REGISTERED_LANGUAGES.has(language);

	return (
		<span {...stylex.props(highlightedCodeStyles.root)}>
			<span {...stylex.props(highlightedCodeStyles.topBar)}>
				<span {...stylex.props(highlightedCodeStyles.languageInfo)}>{language}</span>
			</span>
			{isSupportedLanguage ?
				<Refractor language={language} value={deferredContent} {...stylex.props(highlightedCodeStyles.content)} />
			:	<pre {...stylex.props(highlightedCodeStyles.content)}>
					<code>{deferredContent}</code>
				</pre>
			}
		</span>
	);
};

const styles = stylex.create({
	a: { color: violet[11], fontWeight: fontWeight.medium, textDecoration: "underline", textUnderlineOffset: 2 },
	h1: { fontWeight: fontWeight.medium, marginBlock: spacing[5] },
	h2: { fontWeight: fontWeight.medium, marginBlock: spacing[4] },
	h3: { fontWeight: fontWeight.medium, marginBlockEnd: spacing[3], marginBlockStart: spacing[4] },
	hr: { color: mauve[6], marginBlock: spacing[6] },
	li: {
		"::marker": { fontSize: fontSize[2] },
		lineHeight: lineHeight[4],
		marginBlock: spacing[1],
		marginInlineStart: spacing[5],
		paddingInlineStart: spacing[2],
	},
	ol: { listStyleType: "decimal", marginBlock: spacing[3] },
	p: { lineHeight: lineHeight[4], marginBlock: spacing[3] },
	pre: { inlineSize: "100%", maxInlineSize: "100%", overflowX: "auto", overscrollBehaviorInline: "contain" },
	preformattedProse: { whiteSpace: "pre-wrap", wordBreak: "break-word" },
	strong: { fontWeight: fontWeight.medium },
	table: {
		inlineSize: "100%",
		marginBlockEnd: spacing[6],
		marginBlockStart: spacing[4],
		maxInlineSize: "100%",
		overflowX: "auto",
		overscrollBehaviorInline: "contain",
		tableLayout: "fixed",
	},
	td: { fontSize: fontSize[2], paddingBlock: spacing[3], paddingInline: spacing[4] },
	th: {
		fontSize: fontSize[1],
		fontWeight: fontWeight.medium,
		paddingBlock: spacing[3],
		paddingInline: spacing[4],
		textAlign: "left",
	},
	tr: { borderBlockEndWidth: 1, borderColor: mauve[6], borderStyle: "solid" },
	ul: { listStyleType: "disc", marginBlock: spacing[3] },
});

export const Markdown = ({ children }: Readonly<{ children: string }>) => {
	const components: ComponentPropsWithoutRef<typeof ReactMarkdown>["components"] = {
		a: ({ children, href }) => (
			<a draggable={false} href={href} target="_blank" {...stylex.props(styles.a)}>
				{children}
			</a>
		),
		b: ({ children }) => <b>{children}</b>,
		blockquote: ({ children }) => <blockquote>{children}</blockquote>,
		code: ({ children, className }) => (
			// eslint-disable-next-line react/no-children-prop -- this is expected because children here can be string and we don't want to serialize it as a JSX
			<HighlightedCode children={children} className={className} />
		),
		del: ({ children }) => <del>{children}</del>,
		em: ({ children }) => <em>{children}</em>,
		h1: ({ children }) => <h1 {...stylex.props(styles.h1, typography[6])}>{children}</h1>,
		h2: ({ children }) => <h2 {...stylex.props(styles.h2, typography[5])}>{children}</h2>,
		h3: ({ children }) => <h3 {...stylex.props(styles.h3, typography[4])}>{children}</h3>,
		h4: ({ children }) => <h4>{children}</h4>,
		h5: ({ children }) => <h5>{children}</h5>,
		h6: ({ children }) => <h6>{children}</h6>,
		hr: () => <hr {...stylex.props(styles.hr)} />,
		// eslint-disable-next-line unicorn/prevent-abbreviations -- this is correct, that's HTML tag name
		i: ({ children }) => <i>{children}</i>,
		ins: ({ children }) => <ins>{children}</ins>,
		li: ({ children }) => <li {...stylex.props(styles.li)}>{children}</li>,
		mark: ({ children }) => <mark>{children}</mark>,
		ol: ({ children }) => <ol {...stylex.props(styles.ol)}>{children}</ol>,
		p: ({ children }) => <p {...stylex.props(styles.p)}>{children}</p>,
		pre: ({ children }) => <pre {...stylex.props(styles.pre)}>{children}</pre>,
		s: ({ children }) => <s>{children}</s>,
		small: ({ children }) => <small>{children}</small>,
		span: ({ children }) => <span>{children}</span>,
		strong: ({ children }) => <strong {...stylex.props(styles.strong)}>{children}</strong>,
		sub: ({ children }) => <sub>{children}</sub>,
		sup: ({ children }) => <sup>{children}</sup>,
		table: ({ children }) => <table {...stylex.props(styles.table)}>{children}</table>,
		tbody: ({ children }) => <tbody>{children}</tbody>,
		td: ({ children }) => <td {...stylex.props(styles.td)}>{children}</td>,
		th: ({ children }) => <th {...stylex.props(typography[2], styles.th)}>{children}</th>,
		thead: ({ children }) => <thead>{children}</thead>,
		tr: ({ children }) => <tr {...stylex.props(styles.tr)}>{children}</tr>,
		ul: ({ children }) => <ul {...stylex.props(styles.ul)}>{children}</ul>,
	};

	return (
		<ReactMarkdown
			allowedElements={Object.keys(components)}
			components={components}
			rehypePlugins={[rehypeRaw]}
			remarkPlugins={[remarkGfm]}
			skipHtml
		>
			{children}
		</ReactMarkdown>
	);
};
