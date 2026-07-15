import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * App-wide theme provider. Toggles a `.dark` class on <html>, which the
 * `@custom-variant dark` in index.css keys off — so every shadcn component
 * (all token-based) switches automatically. No per-component color logic.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
