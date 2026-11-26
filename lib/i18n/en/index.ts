/** The English dictionary. Its keys define every UI string; the Hindi table must have the same ones. */
import { EN_ACTIONS } from "./actions";
import { EN_CORE } from "./core";
import { EN_PAGES } from "./pages";
import { EN_SCREENS } from "./screens";

export const EN = {
  ...EN_CORE,
  ...EN_SCREENS,
  ...EN_PAGES,
  ...EN_ACTIONS,
} as const;

/** Every translation key. The Hindi table must define all of them. */
export type Key = keyof typeof EN;
