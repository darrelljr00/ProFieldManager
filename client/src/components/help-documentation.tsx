import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  BookOpen, 
  Video, 
  FileText, 
  Play, 
  Clock, 
  Star,
  ChevronRight,
  HelpCircle,
  Lightbulb,
  Target,
  Users,
  Settings,
  Smartphone,
  BarChart3,
  Shield,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WalkthroughPlayer, BUILTIN_WALKTHROUGHS } from "./interactive-walkthrough";
import { useAuth } from "@/hooks/useAuth";

interface HelpSection {
  id: string;
  title: string;
  icon: any;
  color: string;
  items: HelpItem[];
}

interface HelpItem {
  id: string;
  title: string;
  description: string;
  type: 'tutorial' | 'walkthrough' | 'documentation' | 'video' | 'faq';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  content?: string;
  videoUrl?: string;
  walkthroughId?: string;
  tags: string[];
}

const HELP_SECTIONS: HelpSection[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: Play,
    color: 'bg-blue-500',
    items: [
      {
        id: 'account-setup',
        title: 'Account Setup & Configuration',
        description: 'Set up your account, organization, and basic preferences',
        type: 'tutorial',
        difficulty: 'beginner',
        estimatedTime: 15,
        content: `# Account Setup & Configuration

## Initial Setup
1. **Create Account**: Sign up with your email and company information
2. **Verify Email**: Check your inbox and click the verification link
3. **Organization Setup**: Configure your company profile and branding
4. **User Preferences**: Set your timezone, notifications, and display options

## Essential First Steps
- Add your company logo and contact information
- Set up your primary business address
- Configure notification preferences
- Invite team members to your organization

## Security Setup
- Enable two-factor authentication (recommended)
- Set up strong password requirements
- Review and customize user permissions
- Configure session timeout settings`,
        tags: ['setup', 'onboarding', 'account', 'security']
      },
      {
        id: 'dashboard-overview',
        title: 'Dashboard Overview',
        description: 'Understanding your main dashboard and key metrics',
        type: 'walkthrough',
        difficulty: 'beginner',
        estimatedTime: 5,
        walkthroughId: 'dashboard-tour',
        tags: ['dashboard', 'overview', 'metrics']
      },
      {
        id: 'navigation-basics',
        title: 'Navigation & Interface Basics',
        description: 'Learn how to navigate the interface efficiently',
        type: 'documentation',
        difficulty: 'beginner',
        estimatedTime: 8,
        content: `# Navigation & Interface Basics

## Main Navigation
The sidebar contains all major sections of the application:
- **Dashboard**: Overview and key metrics
- **Jobs**: Project and job management
- **Customers**: Customer relationship management
- **Invoices & Quotes**: Financial management
- **Team**: User and team management

## Search Functionality
Use the search bar to quickly find:
- Customer records
- Job details
- Invoice numbers
- Team members

## Quick Actions
Look for the "+" button or "Add New" buttons throughout the interface for quick creation of:
- New customers
- New jobs
- New invoices
- New team members`,
        tags: ['navigation', 'interface', 'search', 'basics']
      }
    ]
  },
  {
    id: 'core-features',
    title: 'Core Features',
    icon: Target,
    color: 'bg-green-500',
    items: [
      {
        id: 'customer-management',
        title: 'Customer Management',
        description: 'Add, edit, and manage customer information',
        type: 'walkthrough',
        difficulty: 'beginner',
        estimatedTime: 8,
        walkthroughId: 'create-customer',
        tags: ['customers', 'management', 'data-entry']
      },
      {
        id: 'job-creation',
        title: 'Creating and Managing Jobs',
        description: 'Learn how to create, assign, and track jobs',
        type: 'tutorial',
        difficulty: 'intermediate',
        estimatedTime: 20,
        content: `# Creating and Managing Jobs

## Job Creation Process
1. **Navigate to Jobs**: Click on "Jobs" in the sidebar
2. **Add New Job**: Click the "Add Job" button
3. **Basic Information**: Enter job title, description, and customer
4. **Scheduling**: Set start date, end date, and priority
5. **Team Assignment**: Assign team members to the job
6. **Tasks**: Break down the job into specific tasks

## Job Management Features
- **Status Tracking**: Monitor job progress through various stages
- **Time Tracking**: Record time spent on jobs
- **File Attachments**: Upload photos, documents, and reports
- **Customer Communication**: Send updates and collect feedback

## Best Practices
- Use clear, descriptive job titles
- Set realistic timelines and deadlines
- Assign appropriate team members based on skills
- Regular status updates to keep everyone informed
- Document important decisions and changes`,
        tags: ['jobs', 'projects', 'management', 'workflow']
      },
      {
        id: 'invoicing',
        title: 'Invoicing & Billing',
        description: 'Create invoices, track payments, and manage billing',
        type: 'tutorial',
        difficulty: 'intermediate',
        estimatedTime: 25,
        content: `# Invoicing & Billing

## Creating Invoices
1. **Job Completion**: Ensure job is marked as complete
2. **Generate Invoice**: Use the "Create Invoice" button from the job
3. **Line Items**: Add services, materials, and labor costs
4. **Tax Calculation**: Apply appropriate tax rates
5. **Review & Send**: Preview invoice before sending to customer

## Payment Tracking
- **Payment Status**: Track paid, pending, and overdue invoices
- **Payment Methods**: Accept various payment types
- **Automatic Reminders**: Set up automated payment reminders
- **Reporting**: Generate financial reports and summaries

## Invoice Templates
- **Custom Branding**: Add your logo and company information
- **Template Variations**: Create templates for different service types
- **Terms & Conditions**: Include standard terms and payment policies`,
        tags: ['invoicing', 'billing', 'payments', 'financial']
      }
    ]
  },
  {
    id: 'mobile-features',
    title: 'Mobile Features',
    icon: Smartphone,
    color: 'bg-purple-500',
    items: [
      {
        id: 'mobile-overview',
        title: 'Mobile App Overview',
        description: 'Understanding mobile features and capabilities',
        type: 'walkthrough',
        difficulty: 'intermediate',
        estimatedTime: 12,
        walkthroughId: 'mobile-features',
        tags: ['mobile', 'overview', 'features']
      },
      {
        id: 'gps-tracking',
        title: 'GPS Tracking & Location Services',
        description: 'Track team locations and optimize routing',
        type: 'tutorial',
        difficulty: 'intermediate',
        estimatedTime: 15,
        content: `# GPS Tracking & Location Services

## Enabling GPS Tracking
1. **Mobile App**: Download and install the mobile app
2. **Permissions**: Grant location access permissions
3. **Settings**: Configure tracking preferences
4. **Privacy**: Understand data collection and privacy settings

## Location Features
- **Real-time Tracking**: See team member locations in real-time
- **Route Optimization**: Plan efficient routes between jobs
- **Geofencing**: Set up location-based alerts and check-ins
- **Time Tracking**: Automatic time tracking based on location

## Best Practices
- Respect employee privacy and communicate tracking policies
- Use location data to improve efficiency, not for micromanagement
- Regular review of tracking settings and permissions
- Train team on proper use of mobile features`,
        tags: ['gps', 'tracking', 'mobile', 'location', 'routing']
      }
    ]
  },
  {
    id: 'advanced-features',
    title: 'Advanced Features',
    icon: Zap,
    color: 'bg-orange-500',
    items: [
      {
        id: 'reporting',
        title: 'Advanced Reporting & Analytics',
        description: 'Create custom reports and analyze business data',
        type: 'tutorial',
        difficulty: 'advanced',
        estimatedTime: 30,
        content: `# Advanced Reporting & Analytics

## Report Types
- **Financial Reports**: Revenue, expenses, and profit analysis
- **Team Performance**: Productivity and efficiency metrics
- **Customer Reports**: Customer satisfaction and retention
- **Operational Reports**: Job completion rates and timelines

## Custom Dashboard Creation
1. **Widget Selection**: Choose from available widget types
2. **Data Filtering**: Apply filters for specific date ranges or criteria
3. **Layout Customization**: Arrange widgets for optimal visibility
4. **Sharing**: Share dashboards with team members or stakeholders

## Data Export & Integration
- **Export Formats**: CSV, PDF, Excel formats available
- **Scheduled Reports**: Automatic report generation and delivery
- **API Integration**: Connect with third-party tools and services`,
        tags: ['reporting', 'analytics', 'dashboard', 'data', 'business-intelligence']
      }
    ]
  },
  {
    id: 'admin-management',
    title: 'Admin & Management',
    icon: Shield,
    color: 'bg-red-500',
    items: [
      {
        id: 'user-management',
        title: 'User Management & Permissions',
        description: 'Manage team members and set appropriate permissions',
        type: 'tutorial',
        difficulty: 'intermediate',
        estimatedTime: 20,
        content: `# User Management & Permissions

## Adding Team Members
1. **User Invitation**: Send email invitations to new team members
2. **Role Assignment**: Choose appropriate roles and permissions
3. **Department Setup**: Organize users into departments or teams
4. **Initial Setup**: Guide new users through initial setup

## Permission Management
- **Role-Based Access**: Define roles with specific permissions
- **Granular Controls**: Set permissions for individual features
- **Administrative Rights**: Carefully manage admin access
- **Regular Reviews**: Periodically review and update permissions

## Security Best Practices
- Implement strong password policies
- Enable two-factor authentication
- Regular security audits and reviews
- Monitor user activity and access logs`,
        tags: ['users', 'permissions', 'security', 'admin', 'management']
      }
    ]
  }
];

interface HelpDocumentationProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HelpDocumentation({ isOpen, onClose }: HelpDocumentationProps) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<string>("getting-started");
  const [selectedItem, setSelectedItem] = useState<HelpItem | null>(null);
  const [activeWalkthrough, setActiveWalkthrough] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'sections' | 'item' | 'walkthrough'>('sections');

  // Start tutorial/walkthrough progress tracking
  const startTutorialMutation = useMutation({
    mutationFn: (tutorialId: string) => 
      apiRequest("/api/tutorial-progress/start", {
        method: "POST",
        body: { tutorialId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutorial-progress"] });
    },
  });

  // Filter items based on search
  const filteredSections = HELP_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  })).filter(section => section.items.length > 0);

  const handleItemClick = (item: HelpItem) => {
    setSelectedItem(item);
    setViewMode('item');

    if (item.type === 'walkthrough' && item.walkthroughId) {
      setActiveWalkthrough(item.walkthroughId);
      setViewMode('walkthrough');
      onClose(); // Close help to show walkthrough
    }
  };

  const handleWalkthroughComplete = (rating?: number, feedback?: string) => {
    setActiveWalkthrough(null);
    setViewMode('sections');
    // Track completion if needed
  };

  if (!isOpen && !activeWalkthrough) return null;

  // Render active walkthrough
  if (activeWalkthrough) {
    const walkthrough = BUILTIN_WALKTHROUGHS.find(w => w.id === activeWalkthrough);
    if (walkthrough) {
      return (
        <WalkthroughPlayer
          walkthrough={walkthrough}
          onComplete={handleWalkthroughComplete}
          onClose={() => setActiveWalkthrough(null)}
        />
      );
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return Video;
      case 'walkthrough': return Play;
      case 'tutorial': return BookOpen;
      case 'documentation': return FileText;
      default: return HelpCircle;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-6xl mx-4 h-[90vh] flex flex-col">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Help & Documentation
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={onClose}>
              ×
            </Button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search help topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {viewMode === 'item' && (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => setViewMode('sections')}
              >
                ← Back to Sections
              </Button>
            )}
          </div>
        </CardHeader>

        <div className="flex-1 overflow-hidden">
          {viewMode === 'sections' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
              {/* Sections Sidebar */}
              <div className="border-r overflow-y-auto p-4">
                <div className="space-y-2">
                  {filteredSections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setSelectedSection(section.id)}
                      className={cn(
                        "w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3",
                        selectedSection === section.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                    >
                      <div className={cn("w-8 h-8 rounded flex items-center justify-center text-white", section.color)}>
                        <section.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-medium">{section.title}</div>
                        <div className="text-sm opacity-80">{section.items.length} items</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Items List */}
              <div className="col-span-2 overflow-y-auto p-4">
                {(() => {
                  const section = filteredSections.find(s => s.id === selectedSection);
                  if (!section) return null;

                  return (
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold">{section.title}</h2>
                      
                      <div className="grid gap-4">
                        {section.items.map((item) => {
                          const TypeIcon = getTypeIcon(item.type);
                          
                          return (
                            <Card 
                              key={item.id} 
                              className="cursor-pointer hover:shadow-md transition-shadow"
                              onClick={() => handleItemClick(item)}
                            >
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <TypeIcon className="w-4 h-4 text-muted-foreground" />
                                    <h3 className="font-medium">{item.title}</h3>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                </div>
                                
                                <p className="text-sm text-muted-foreground mb-3">
                                  {item.description}
                                </p>
                                
                                <div className="flex items-center gap-2">
                                  <Badge className={getDifficultyColor(item.difficulty)}>
                                    {item.difficulty}
                                  </Badge>
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {item.estimatedTime}min
                                  </Badge>
                                  <Badge variant="outline">
                                    {item.type}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {viewMode === 'item' && selectedItem && (
            <div className="h-full overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-2">
                    {(() => {
                      const TypeIcon = getTypeIcon(selectedItem.type);
                      return <TypeIcon className="w-5 h-5 text-muted-foreground" />;
                    })()}
                    <h1 className="text-2xl font-bold">{selectedItem.title}</h1>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-4">
                    <Badge className={getDifficultyColor(selectedItem.difficulty)}>
                      {selectedItem.difficulty}
                    </Badge>
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {selectedItem.estimatedTime} minutes
                    </Badge>
                  </div>
                  
                  <p className="text-muted-foreground">{selectedItem.description}</p>
                </div>

                {selectedItem.content && (
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div dangerouslySetInnerHTML={{ 
                      __html: selectedItem.content.replace(/\n/g, '<br>').replace(/## /g, '<h2>').replace(/# /g, '<h1>')
                    }} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}