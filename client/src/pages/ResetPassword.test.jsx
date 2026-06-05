import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import ResetPassword from "./ResetPassword.jsx";
import * as apiModule from "../api.js";

// Mock the API layer.
vi.mock("../api.js", () => ({
  verifyResetToken: vi.fn(),
  submitNewPassword: vi.fn(),
}));

// Mock router hooks so the component sees a token param and a navigate fn.
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useParams: () => ({ token: "test-token-123" }),
    useNavigate: () => mockNavigate,
  };
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <ResetPassword />
    </MemoryRouter>
  );

describe("ResetPassword page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("shows a verifying state initially", async () => {
    // Keep verification pending so we can observe the loading state.
    apiModule.verifyResetToken.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText(/verifying your reset link/i)).toBeInTheDocument();
  });

  test("invalid/expired token shows the expired alert", async () => {
    apiModule.verifyResetToken.mockRejectedValueOnce(new Error("invalid"));
    renderPage();

    expect(
      await screen.findByRole("heading", { name: /expired or invalid/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /request a new link/i })
    ).toBeInTheDocument();
  });

  test("valid token renders the new-password form", async () => {
    apiModule.verifyResetToken.mockResolvedValueOnce({ valid: true });
    renderPage();

    expect(
      await screen.findByRole("heading", { name: /set a new password/i })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  test("password visibility toggle switches input type", async () => {
    apiModule.verifyResetToken.mockResolvedValueOnce({ valid: true });
    const user = userEvent.setup();
    renderPage();

    const input = await screen.findByLabelText(/new password/i);
    expect(input).toHaveAttribute("type", "password");

    await user.click(screen.getByRole("button", { name: /show password/i }));
    expect(input).toHaveAttribute("type", "text");
  });

  test("shows a strength label as the password gets stronger", async () => {
    apiModule.verifyResetToken.mockResolvedValueOnce({ valid: true });
    const user = userEvent.setup();
    const { container } = renderPage();

    const input = await screen.findByLabelText(/new password/i);
    await user.type(input, "Str0ng!Passw0rd");

    const label = container.querySelector(".strength-label");
    expect(label).toBeInTheDocument();
    expect(label).toHaveTextContent(/strong/i);
  });

  test("mismatched passwords show an inline error", async () => {
    apiModule.verifyResetToken.mockResolvedValueOnce({ valid: true });
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText(/new password/i), "abcdef1");
    await user.type(screen.getByLabelText(/confirm password/i), "different1");

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
  });

  test("rejects a too-short password before calling API", async () => {
    apiModule.verifyResetToken.mockResolvedValueOnce({ valid: true });
    const user = userEvent.setup();
    renderPage();

    await user.type(await screen.findByLabelText(/new password/i), "123");
    await user.type(screen.getByLabelText(/confirm password/i), "123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(
      await screen.findByText(/at least 6 characters/i)
    ).toBeInTheDocument();
    expect(apiModule.submitNewPassword).not.toHaveBeenCalled();
  });

  test("successful reset calls API and shows success screen", async () => {
    apiModule.verifyResetToken.mockResolvedValueOnce({ valid: true });
    apiModule.submitNewPassword.mockResolvedValueOnce({ message: "ok" });
    const user = userEvent.setup();
    renderPage();

    await user.type(
      await screen.findByLabelText(/new password/i),
      "newpass123"
    );
    await user.type(screen.getByLabelText(/confirm password/i), "newpass123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    await waitFor(() =>
      expect(apiModule.submitNewPassword).toHaveBeenCalledWith(
        "test-token-123",
        "newpass123"
      )
    );
    expect(
      await screen.findByRole("heading", { name: /password reset/i })
    ).toBeInTheDocument();
  });

  test("server rejection with expired message flips to the expired view", async () => {
    apiModule.verifyResetToken.mockResolvedValueOnce({ valid: true });
    apiModule.submitNewPassword.mockRejectedValueOnce(
      new Error("This reset link is invalid or has expired.")
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(
      await screen.findByLabelText(/new password/i),
      "newpass123"
    );
    await user.type(screen.getByLabelText(/confirm password/i), "newpass123");
    await user.click(screen.getByRole("button", { name: /reset password/i }));

    expect(
      await screen.findByRole("heading", { name: /expired or invalid/i })
    ).toBeInTheDocument();
  });
});
