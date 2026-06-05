import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import ForgotPassword from "./ForgotPassword.jsx";
import * as apiModule from "../api.js";

// Mock the API layer so no real network calls happen.
vi.mock("../api.js", () => ({
  requestPasswordReset: vi.fn(),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <ForgotPassword />
    </MemoryRouter>
  );

describe("ForgotPassword page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders heading, email input and submit button", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /forgot password/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send reset link/i })
    ).toBeInTheDocument();
  });

  test("shows validation error for an invalid email and does not call API", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/email address/i), "not-an-email");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(
      await screen.findByText(/valid email address/i)
    ).toBeInTheDocument();
    expect(apiModule.requestPasswordReset).not.toHaveBeenCalled();
  });

  test("calls API and shows success screen on valid submit", async () => {
    apiModule.requestPasswordReset.mockResolvedValueOnce({ message: "ok" });
    const user = userEvent.setup();
    renderPage();

    await user.type(
      screen.getByLabelText(/email address/i),
      "user@example.com"
    );
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    await waitFor(() =>
      expect(apiModule.requestPasswordReset).toHaveBeenCalledWith(
        "user@example.com"
      )
    );
    expect(
      await screen.findByRole("heading", { name: /check your inbox/i })
    ).toBeInTheDocument();
    // The entered email is echoed back on the success screen.
    expect(screen.getByText(/user@example.com/i)).toBeInTheDocument();
  });

  test("shows server error message when API rejects", async () => {
    apiModule.requestPasswordReset.mockRejectedValueOnce(
      new Error("No account found with that email address.")
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(
      screen.getByLabelText(/email address/i),
      "ghost@nowhere.com"
    );
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    expect(await screen.findByText(/no account found/i)).toBeInTheDocument();
    // Should remain on the form, not the success screen.
    expect(
      screen.queryByRole("heading", { name: /check your inbox/i })
    ).not.toBeInTheDocument();
  });

  test("can return to the form from the success screen", async () => {
    apiModule.requestPasswordReset.mockResolvedValueOnce({ message: "ok" });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/email address/i), "a@b.com");
    await user.click(screen.getByRole("button", { name: /send reset link/i }));

    const backBtn = await screen.findByRole("button", {
      name: /different email/i,
    });
    await user.click(backBtn);

    expect(
      screen.getByRole("heading", { name: /forgot password/i })
    ).toBeInTheDocument();
  });
});
