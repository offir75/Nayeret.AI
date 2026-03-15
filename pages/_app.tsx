import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ThemeProvider } from 'next-themes';
import { SettingsProvider } from '@/lib/context/settings';
import { WorkspaceProvider } from '@/lib/context/workspace';
import { Toaster } from 'sonner';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SettingsProvider>
        <WorkspaceProvider>
          <Component {...pageProps} />
          <Toaster richColors position="bottom-right" />
        </WorkspaceProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default MyApp;
