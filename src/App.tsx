import { AppRouting } from '@/routing/app-routing';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { LoadingBarContainer } from 'react-top-loading-bar';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from './auth/providers/supabase-provider';
import { DashboardDataProvider } from './providers/dashboard-data-provider';
import { I18nProvider } from './providers/i18n-provider';
import { ModulesProvider } from './providers/modules-provider';
import { QueryProvider } from './providers/query-provider';
import { SettingsProvider } from './providers/settings-provider';
import { ThemeProvider } from './providers/theme-provider';
import { TooltipsProvider } from './providers/tooltips-provider';

const { BASE_URL } = import.meta.env;

export function App() {
  return (
    <QueryProvider>
      <AuthProvider>
        <DashboardDataProvider>
          <SettingsProvider>
            <ThemeProvider>
              <I18nProvider>
                <HelmetProvider>
                  <TooltipsProvider>
                    <LoadingBarContainer>
                      <BrowserRouter basename={BASE_URL}>
                        <Toaster />
                        <ModulesProvider>
                          <AppRouting />
                        </ModulesProvider>
                      </BrowserRouter>
                    </LoadingBarContainer>
                  </TooltipsProvider>
                </HelmetProvider>
              </I18nProvider>
            </ThemeProvider>
          </SettingsProvider>
        </DashboardDataProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
