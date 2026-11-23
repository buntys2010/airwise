/** The languages the app speaks, in their own module so UI text, chat and prompts can share them. */
export type Lang = "en" | "hi";

/** Every supported language, for validating input that claims to be one. */
export const LANGS: Lang[] = ["en", "hi"];
