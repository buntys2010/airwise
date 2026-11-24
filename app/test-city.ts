/** Test helpers for the city picker, shared by the component tests. */
import { fireEvent, screen } from "@testing-library/react";

/**
 * Test helpers for the city picker (a combobox): read the current city, and choose one the way a
 * user does.
 */
export const cityBox = () => screen.getByRole<HTMLInputElement>("combobox", { name: "City" });
/** The city currently shown in the picker. */
export const cityName = () => cityBox().value;

/** Types a city name into the picker and chooses the matching option, the way a person would. */
export function pickCity(name: string) {
  const box = cityBox();
  fireEvent.focus(box);
  fireEvent.change(box, { target: { value: name } });
  fireEvent.click(screen.getByRole("option", { name: new RegExp(`^${name}`) }));
}
