import { defaultSchema } from "rehype-sanitize";

export const githubMarkdownSanitizeSchema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "details",
    "summary",
  ],
  attributes: {
    ...defaultSchema.attributes,
    details: [...(defaultSchema.attributes?.details ?? []), "open"],
    summary: defaultSchema.attributes?.summary ?? [],
  },
} as const;
