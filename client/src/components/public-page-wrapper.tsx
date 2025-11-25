import { useAnalytics } from "@/hooks/use-analytics";

interface PublicPageWrapperProps {
  children: React.ReactNode;
  pageName?: string;
}

export function PublicPageWrapper({ children, pageName }: PublicPageWrapperProps) {
  useAnalytics({ 
    enableInternal: true, 
    organizationId: 4, 
    enableGA: true, 
    enableFB: true 
  });

  return <>{children}</>;
}

export function withPublicAnalytics<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  pageName?: string
): React.FC<P> {
  const WithAnalytics: React.FC<P> = (props) => {
    useAnalytics({ 
      enableInternal: true, 
      organizationId: 4, 
      enableGA: true, 
      enableFB: true 
    });
    
    return <WrappedComponent {...props} />;
  };
  
  WithAnalytics.displayName = `WithPublicAnalytics(${WrappedComponent.displayName || WrappedComponent.name || 'Component'})`;
  
  return WithAnalytics;
}
