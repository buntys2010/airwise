import { fireEvent, screen } from "@testing-library/react";

/** Test helpers for the city picker (a combobox): read the current city, and choose one the way a user does. */
export const cityBox = () => screen.getByRole<HTMLInputElement>("combobox", { name: "City" });
export const cityName = () => cityBox().value;

export function pickCity(name: string) {
  const box = cityBox();
  fireEvent.focus(box);
  fireEvent.change(box, { target: { value: name } });
  fireEvent.click(screen.getByRole("option", { name: new RegExp(`^${name}`) }));
}
