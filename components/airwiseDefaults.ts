/** The planner's starting household and city, and how to tell two households apart. */
import { type Profile } from "@/lib/engine/model";
import { SAMPLE_PROFILE_PATCH } from "@/lib/room";

export const sameProfile = (a: Profile, b: Profile) =>
  a.home === b.home &&
  a.commute === b.commute &&
  a.km === b.km &&
  a.cooking === b.cooking &&
  a.vulnerable === b.vulnerable;
/**
 * The sample-room family: an older flat in Lucknow, gas cooking, a two-wheeler commute, an
 * asthmatic child.
 */
export const DEFAULT_PROFILE: Profile = {
  home: SAMPLE_PROFILE_PATCH.home,
  commute: "bike",
  km: 8,
  cooking: SAMPLE_PROFILE_PATCH.cooking,
  vulnerable: true,
};
export const DEFAULT_CITY = "lucknow";
