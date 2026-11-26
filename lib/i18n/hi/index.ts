/** The Hindi dictionary. Written without a native review, so a Hindi reader should check it. */
import type { Key } from "../en";
import { HI_ACTIONS } from "./actions";
import { HI_CORE } from "./core";
import { HI_PAGES } from "./pages";
import { HI_SCREENS } from "./screens";

/** The Hindi dictionary, typed against the English keys so a missing key fails the build. */
export const HI: Record<Key, string> = {
  ...HI_CORE,
  ...HI_SCREENS,
  ...HI_PAGES,
  ...HI_ACTIONS,
};
