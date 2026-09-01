import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { hydrateRoot } from "react-dom/client";
import { I18nProvider } from "../../src/runtime/I18nProvider.js";
import { useTranslation } from "../../src/runtime/useTranslation.js";
import type { I18nConfig, Messages } from "../../src/runtime/types.js";

const config: I18nConfig<"az" | "en" | "ru"> = {
  defaultLocale: "az",
  locales: ["az", "en", "ru"],
};

const messages: Record<"az" | "en" | "ru", Messages> = {
  az: { common: { hello: "Salam", helloUser: "Salam, {{name}}!" } },
  en: { common: { hello: "Hello", helloUser: "Hello, {{name}}!" } },
  ru: { common: { hello: "Привет" } },
};

function Consumer() {
  const { t, locale, setLocale, availableLocales } = useTranslation<"az" | "en" | "ru">();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="hello">{t("common.hello")}</span>
      <span data-testid="available">{availableLocales.join(",")}</span>
      <button onClick={() => setLocale("en")}>to-en</button>
      <button onClick={() => setLocale("unknown" as "en")}>to-invalid</button>
    </div>
  );
}

function renderWithProvider(persist = false) {
  return render(
    <I18nProvider config={config} messages={messages} persist={persist}>
      <Consumer />
    </I18nProvider>
  );
}

describe("I18nProvider + useTranslation", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("throws a clear error when used outside a provider", () => {
    expect(() => renderHook(() => useTranslation())).toThrow(/must be used within an <I18nProvider>/);
  });

  it("renders the default locale on first render", () => {
    renderWithProvider();
    expect(screen.getByTestId("locale").textContent).toBe("az");
    expect(screen.getByTestId("hello").textContent).toBe("Salam");
    expect(screen.getByTestId("available").textContent).toBe("az,en,ru");
  });

  it("switches locale via setLocale, updating t() output", async () => {
    renderWithProvider();
    act(() => {
      screen.getByText("to-en").click();
    });
    await waitFor(() => expect(screen.getByTestId("locale").textContent).toBe("en"));
    expect(screen.getByTestId("hello").textContent).toBe("Hello");
  });

  it("ignores setLocale calls with a locale outside the configured list", () => {
    renderWithProvider();
    act(() => {
      screen.getByText("to-invalid").click();
    });
    expect(screen.getByTestId("locale").textContent).toBe("az");
  });

  it("interpolates params through the hook's t()", () => {
    function NameConsumer() {
      const { t } = useTranslation<"az" | "en" | "ru">();
      return <span data-testid="greeting">{t("common.helloUser", { name: "Mehemmed" })}</span>;
    }
    render(
      <I18nProvider config={config} messages={messages}>
        <NameConsumer />
      </I18nProvider>
    );
    expect(screen.getByTestId("greeting").textContent).toBe("Salam, Mehemmed!");
  });

  describe("persistence", () => {
    it("does not persist when persist is false", async () => {
      renderWithProvider(false);
      act(() => {
        screen.getByText("to-en").click();
      });
      await waitFor(() => expect(screen.getByTestId("locale").textContent).toBe("en"));
      expect(window.localStorage.getItem("mhlang-locale")).toBeNull();
    });

    it("writes the selected locale to localStorage when persist is true", async () => {
      renderWithProvider(true);
      act(() => {
        screen.getByText("to-en").click();
      });
      await waitFor(() => expect(window.localStorage.getItem("mhlang-locale")).toBe("en"));
    });

    it("server-renders the default locale and hydrates to the persisted locale without a mismatch", async () => {
      window.localStorage.setItem("mhlang-locale", "ru");

      const app = (
        <I18nProvider config={config} messages={messages} persist={true}>
          <Consumer />
        </I18nProvider>
      );

      // The server has no access to the browser's localStorage, so it must
      // always render the configured default locale.
      const serverHtml = renderToString(app);
      expect(serverHtml).toContain('data-testid="locale">az<');

      const container = document.createElement("div");
      container.innerHTML = serverHtml;
      document.body.appendChild(container);

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await act(async () => {
        hydrateRoot(container, app);
      });

      // React logs a "Hydration failed"/"did not match" error when the client's
      // first render disagrees with the server HTML. There must be none.
      const hydrationMismatch = errorSpy.mock.calls.some((call) =>
        call.some((arg) => typeof arg === "string" && /hydrat/i.test(arg))
      );
      expect(hydrationMismatch).toBe(false);

      // After mount, the persisted locale is applied.
      await waitFor(() =>
        expect(container.querySelector('[data-testid="locale"]')?.textContent).toBe("ru")
      );

      document.body.removeChild(container);
      errorSpy.mockRestore();
    });

    it("ignores a persisted locale that is no longer in the configured list", async () => {
      window.localStorage.setItem("mhlang-locale", "fr");
      renderWithProvider(true);
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(screen.getByTestId("locale").textContent).toBe("az");
    });
  });
});
