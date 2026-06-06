import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Register from "./Register.jsx";
import * as apiModule from "../api.js";

vi.mock("../api.js", () => ({
  registerUser: vi.fn(),
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>
  );

describe("Register page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("renders name, email, password fields and submit button", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /create your account/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create account/i })
    ).toBeInTheDocument();
  });

  test("blocks invalid email and does not call API", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/email address/i), "bad-email");
    await user.type(screen.getByLabelText(/^password$/i), "goodpass1");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(apiModule.registerUser).not.toHaveBeenCalled();
  });

  test("blocks short password", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/email address/i), "ok@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/at least 6 characters/i)).toBeInTheDocument();
    expect(apiModule.registerUser).not.toHaveBeenCalled();
  });

  test("calls API and shows success on valid submit", async () => {
    apiModule.registerUser.mockResolvedValueOnce({ message: "ok" });
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/name/i), "Test");
    await user.type(screen.getByLabelText(/email address/i), "new@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "goodpass1");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(apiModule.registerUser).toHaveBeenCalledWith(
        "Test",
        "new@example.com",
        "goodpass1"
      )
    );
    expect(
      await screen.findByRole("heading", { name: /account created/i })
    ).toBeInTheDocument();
  });

  test("shows server error (e.g. duplicate email)", async () => {
    apiModule.registerUser.mockRejectedValueOnce(
      new Error("An account with this email already exists.")
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText(/email address/i), "dupe@example.com");
    await user.type(screen.getByLabelText(/^password$/i), "goodpass1");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
  });
});
