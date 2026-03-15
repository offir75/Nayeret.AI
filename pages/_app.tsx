import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes';
import { SettingsProvider } from '@/lib/context/settings';
import { Toaster } from 'sonner';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SettingsProvider>
        <Component {...pageProps} />
        <Toaster richColors position="bottom-right" />
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default MyApp;
