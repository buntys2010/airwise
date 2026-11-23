// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import ErrorPage from "./error";
import GlobalError from "./global-error";
import NotFound from "./not-found";

afterEach(cleanup);

describe("error pages", () => {
  it("the page error screen explains nothing is lost, shows the reference, and retries", () => {
    const reset = vi.fn();
    render(
      <ErrorPage error={Object.assign(new Error("boom"), { digest: "abc123" })} reset={reset} />,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Something went wrong.");
    expect(screen.getByText(/Reference: abc123/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("leaves out the reference line when the error has no digest", () => {
    render(<ErrorPage error={new Error("boom")} reset={() => undefined} />);
    expect(screen.queryByText(/Reference:/)).toBeNull();
  });

  it("the global error screen is a complete document with its own retry button", () => {
    const html = renderToStaticMarkup(
      <GlobalError error={new Error("boom")} reset={() => undefined} />,
    );
    expect(html).toContain("<html");
    expect(html).toContain("AirWise could not start");
    expect(html).toContain("Try again");
  });

  it("the not-found page links back home", () => {
    render(<NotFound />);
    expect(screen.getByRole("link", { name: "Back to AirWise" }).getAttribute("href")).toBe("/");
  });
});
