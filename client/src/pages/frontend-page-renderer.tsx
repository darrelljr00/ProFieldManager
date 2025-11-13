import { useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface FrontendComponent {
  id: number;
  type: string;
  props?: any;
  style?: any;
  content?: string;
  sortOrder: number;
}

interface FrontendPage {
  id: number;
  title: string;
  slug: string;
  description?: string;
  metaTitle?: string;
  metaDescription?: string;
  template: string;
  featuredImage?: string;
  customCss?: string;
  components: FrontendComponent[];
  organization: {
    id: number;
    name: string;
    slug: string;
  };
}

function ComponentRenderer({ component }: { component: FrontendComponent }) {
  const { type, props = {}, style = {}, content } = component;

  const baseStyle = {
    backgroundColor: style.backgroundColor || 'transparent',
    color: style.textColor || style.color || 'inherit',
    borderRadius: `${style.borderRadius || 0}px`,
    padding: `${style.padding || 0}px`,
    margin: `${style.margin || 0}px`,
    ...style,
  };

  switch (type) {
    case 'text':
      return (
        <div style={baseStyle} data-component-type="text">
          <p style={{ fontSize: style.fontSize || '16px' }}>
            {content || props.content || 'Text content'}
          </p>
        </div>
      );

    case 'heading':
      const HeadingTag = (props.level || 'h2') as keyof JSX.IntrinsicElements;
      return (
        <div style={baseStyle} data-component-type="heading">
          <HeadingTag style={{ 
            fontSize: style.fontSize || '32px',
            fontWeight: style.fontWeight || 'bold'
          }}>
            {content || props.content || 'Heading'}
          </HeadingTag>
        </div>
      );

    case 'image':
      return (
        <div style={baseStyle} data-component-type="image">
          <img
            src={props.src || ''}
            alt={props.alt || 'Image'}
            style={{
              maxWidth: props.width || '100%',
              height: 'auto',
              ...style
            }}
          />
        </div>
      );

    case 'button':
      return (
        <div style={baseStyle} data-component-type="button">
          <Button
            asChild
            style={style}
          >
            <a href={props.href || '#'}>
              {props.text || content || 'Click Me'}
            </a>
          </Button>
        </div>
      );

    case 'container':
      return (
        <div
          style={{
            ...baseStyle,
            maxWidth: props.maxWidth || '1200px',
            margin: '0 auto',
          }}
          data-component-type="container"
        >
          {content || props.content || 'Container'}
        </div>
      );

    case 'hero':
      return (
        <div
          style={{
            ...baseStyle,
            textAlign: props.textAlign || 'center',
            padding: '60px 20px',
          }}
          data-component-type="hero"
        >
          {props.image && (
            <img
              src={props.image}
              alt="Hero"
              style={{ width: '100%', maxHeight: '400px', objectFit: 'cover' }}
            />
          )}
          <h1 style={{ fontSize: '48px', fontWeight: 'bold', marginTop: '20px' }}>
            {props.title || 'Hero Title'}
          </h1>
          <p style={{ fontSize: '20px', marginTop: '10px' }}>
            {props.subtitle || 'Hero Subtitle'}
          </p>
        </div>
      );

    case 'card':
      return (
        <Card style={baseStyle} data-component-type="card">
          <div className="p-6">
            {props.title && <h3 className="text-xl font-semibold mb-2">{props.title}</h3>}
            {content || props.content || 'Card content'}
          </div>
        </Card>
      );

    default:
      return (
        <div style={baseStyle} data-component-type="unknown">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Unknown component type: {type}
            </AlertDescription>
          </Alert>
        </div>
      );
  }
}

export default function FrontendPageRenderer() {
  const params = useParams();
  const { orgSlug, pageSlug } = params as { orgSlug: string; pageSlug: string };

  const { data: page, isLoading, error } = useQuery<FrontendPage>({
    queryKey: ['/api/public/pages', orgSlug, pageSlug],
    queryFn: async () => {
      const response = await fetch(`/api/public/pages/${orgSlug}/${pageSlug}`);
      if (!response.ok) {
        throw new Error('Page not found');
      }
      return response.json();
    },
    enabled: !!orgSlug && !!pageSlug,
  });

  // Set page metadata
  useEffect(() => {
    if (page) {
      document.title = page.metaTitle || page.title;
      
      // Set meta description
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', page.metaDescription || page.description || '');

      // Add custom CSS if provided
      if (page.customCss) {
        const styleEl = document.createElement('style');
        styleEl.id = `custom-page-css-${page.id}`;
        styleEl.textContent = page.customCss;
        document.head.appendChild(styleEl);

        return () => {
          // Cleanup custom CSS on unmount
          const el = document.getElementById(`custom-page-css-${page.id}`);
          if (el) el.remove();
        };
      }
    }
  }, [page]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-4">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Page not found. This page may have been removed or is not published yet.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const sortedComponents = [...page.components].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="min-h-screen bg-background" data-page-id={page.id}>
      {page.featuredImage && (
        <div className="w-full h-64 overflow-hidden">
          <img
            src={page.featuredImage}
            alt={page.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <div className="container mx-auto py-8">
        {sortedComponents.length > 0 ? (
          <div className="space-y-4">
            {sortedComponents.map((component) => (
              <ComponentRenderer key={component.id} component={component} />
            ))}
          </div>
        ) : (
          <Alert>
            <AlertDescription>
              This page has no content yet. Use the Frontend Management interface to add components.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
