// Vitest global setup: adds jest-dom matchers (toBeInTheDocument, etc.) and
// resets mocks between tests.
import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
