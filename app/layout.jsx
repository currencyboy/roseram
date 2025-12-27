import { IntegrationProvider } from "@/lib/integrations-context";
import { ProjectProvider } from "@/lib/project-context";
import { AuthProvider } from "@/components/AuthProvider";
import { UserSessionProvider } from "@/components/UserSessionProvider";
import { BillingProvider } from "@/components/BillingProvider";
import { UsageInsightsModal } from "@/components/UsageInsightsModal";
import { ErrorSuppressorClient } from "@/components/ErrorSuppressorClient";
import { BranchSyncProvider } from "@/lib/branch-sync-context";
import "./globals.css";

export const metadata = {
  title: "Roseram Super Intelligence",
  description: "Build with AI, deploy with confidence",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <IntegrationProvider>
          <AuthProvider>
            <ProjectProvider>
              <BillingProvider>
                <BranchSyncProvider>
                  <UserSessionProvider>
                    <ErrorSuppressorClient />
                    {children}
                    <UsageInsightsModal />
                  </UserSessionProvider>
                </BranchSyncProvider>
              </BillingProvider>
            </ProjectProvider>
          </AuthProvider>
        </IntegrationProvider>
      </body>
    </html>
  );
}
