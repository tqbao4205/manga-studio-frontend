import { ErrorBoundary } from "../shared/components/shared/ErrorBoundary";

export function AppProviders({ children }) {
  return <ErrorBoundary>{children}</ErrorBoundary>;
}
