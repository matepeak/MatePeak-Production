import { AlertCircle, Wifi, WifiOff } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface ConnectionStatusProps {
  error?: Error | null;
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function ConnectionStatus({ 
  error, 
  onRetry,
  isRetrying = false 
}: ConnectionStatusProps) {
  if (!error) return null;

  const isNetworkError = 
    error.message?.includes('timeout') ||
    error.message?.includes('network') ||
    error.message?.includes('fetch') ||
    error.message?.includes('Connection');

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Alert variant="destructive" className="mb-4">
        <div className="flex items-start gap-3">
          {isNetworkError ? (
            <WifiOff className="h-5 w-5 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          )}
          <div className="flex-1 space-y-2">
            <AlertTitle className="text-lg font-semibold">
              {isNetworkError ? 'Connection Problem' : 'Something went wrong'}
            </AlertTitle>
            <AlertDescription className="text-sm space-y-3">
              <p>{error.message}</p>
              
              {isNetworkError && (
                <div className="space-y-2 pl-4 border-l-2 border-destructive/30 mt-3">
                  <p className="font-medium">Possible solutions:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Check your internet connection</li>
                    <li>Disable VPN or proxy if enabled</li>
                    <li>Try using a different network (mobile hotspot)</li>
                    <li>Check firewall settings - ensure port 443 is open</li>
                    <li>Contact your network administrator if on corporate network</li>
                  </ul>
                </div>
              )}
            </AlertDescription>
            
            {onRetry && (
              <div className="flex gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                  disabled={isRetrying}
                  className="gap-2"
                >
                  <Wifi className="h-4 w-4" />
                  {isRetrying ? 'Retrying...' : 'Retry Connection'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </Alert>
    </div>
  );
}
