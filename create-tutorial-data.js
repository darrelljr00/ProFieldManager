import pkg from 'pg';
const { Client } = pkg;

// Database connection
const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

const tutorialCategories = [
  {
    name: 'Getting Started',
    slug: 'getting-started',
    description: 'Essential tutorials for new users to get up and running',
    icon: 'play-circle',
    color: '#3B82F6',
    sortOrder: 1
  },
  {
    name: 'Core Features',
    slug: 'core-features',
    description: 'Master the main features of Pro Field Manager',
    icon: 'settings',
    color: '#10B981',
    sortOrder: 2
  },
  {
    name: 'Mobile App',
    slug: 'mobile-app',
    description: 'Learn how to use the mobile application effectively',
    icon: 'smartphone',
    color: '#8B5CF6',
    sortOrder: 3
  },
  {
    name: 'Advanced Features',
    slug: 'advanced-features',
    description: 'Advanced workflows and power user features',
    icon: 'star',
    color: '#F59E0B',
    sortOrder: 4
  },
  {
    name: 'Admin & Management',
    slug: 'admin-management',
    description: 'Administrative tools and team management',
    icon: 'shield',
    color: '#EF4444',
    sortOrder: 5
  }
];

const tutorials = [
  // Getting Started Category
  {
    title: 'Account Setup & First Login',
    slug: 'account-setup-first-login',
    description: 'Learn how to set up your account, configure your organization, and navigate the dashboard for the first time.',
    category: 'getting-started',
    type: 'video',
    difficulty: 'beginner',
    estimatedTime: 15,
    content: `# Account Setup & First Login

Welcome to Pro Field Manager! This tutorial will guide you through setting up your account and getting started.

## What You'll Learn
- How to create your account
- Setting up your organization profile
- Understanding the dashboard layout
- Basic navigation

## Steps
1. **Account Creation**: Enter your details and verify your email
2. **Organization Setup**: Configure your company information
3. **Dashboard Tour**: Overview of the main interface
4. **Settings Configuration**: Basic preferences and permissions

## Next Steps
After completing this tutorial, you'll be ready to start adding customers and creating your first project.`,
    tags: ['setup', 'onboarding', 'basics'],
    viewCount: 0,
    averageRating: 0,
    totalRatings: 0,
    prerequisites: []
  },
  {
    title: 'Adding Your First Customer',
    slug: 'adding-first-customer',
    description: 'Step-by-step guide to adding customer information and managing customer data.',
    category: 'getting-started',
    type: 'interactive',
    difficulty: 'beginner',
    estimatedTime: 10,
    content: `# Adding Your First Customer

Learn how to effectively manage customer information in Pro Field Manager.

## What You'll Learn
- How to add new customers
- Managing customer contact information
- Setting up billing addresses
- Customer communication preferences

## Interactive Steps
1. Navigate to Customers page
2. Click "Add New Customer"
3. Fill in required information
4. Set communication preferences
5. Save and verify

## Best Practices
- Always verify contact information
- Use consistent naming conventions
- Add notes for special requirements`,
    tags: ['customers', 'data-entry', 'basics'],
    viewCount: 0,
    averageRating: 0,
    totalRatings: 0,
    prerequisites: ['account-setup-first-login']
  },
  {
    title: 'Creating Your First Project',
    slug: 'creating-first-project',
    description: 'Learn how to create projects, assign team members, and track progress.',
    category: 'core-features',
    type: 'video',
    difficulty: 'beginner',
    estimatedTime: 20,
    content: `# Creating Your First Project

Projects are the heart of Pro Field Manager. Learn how to create and manage them effectively.

## What You'll Learn
- Project creation workflow
- Assigning team members
- Setting schedules and deadlines
- Adding tasks and milestones

## Steps
1. **Project Setup**: Basic information and scope
2. **Team Assignment**: Adding the right people
3. **Scheduling**: Setting dates and priorities
4. **Task Management**: Breaking down work
5. **Progress Tracking**: Monitoring completion

## Tips for Success
- Be specific with project descriptions
- Set realistic timelines
- Communicate with your team regularly`,
    tags: ['projects', 'workflow', 'team-management'],
    viewCount: 0,
    averageRating: 0,
    totalRatings: 0,
    prerequisites: ['adding-first-customer']
  },
  {
    title: 'GPS Tracking & Mobile Features',
    slug: 'gps-tracking-mobile',
    description: 'Master location tracking, mobile check-ins, and field reporting on your mobile device.',
    category: 'mobile-app',
    type: 'video',
    difficulty: 'intermediate',
    estimatedTime: 25,
    content: `# GPS Tracking & Mobile Features

Learn how to use Pro Field Manager's powerful mobile capabilities for field work.

## What You'll Learn
- Setting up GPS tracking
- Mobile check-in/check-out
- Location-based reporting
- Offline functionality
- Photo uploads from the field

## Mobile Features Covered
1. **GPS Setup**: Enabling location services
2. **Time Tracking**: Clock in/out with location
3. **Photo Documentation**: Capturing work progress
4. **Real-time Updates**: Syncing with the office
5. **Offline Mode**: Working without internet

## Safety & Privacy
- Understanding location permissions
- Data security on mobile devices
- Privacy settings and controls`,
    tags: ['mobile', 'gps', 'tracking', 'field-work'],
    viewCount: 0,
    averageRating: 0,
    totalRatings: 0,
    prerequisites: ['creating-first-project']
  },
  {
    title: 'Advanced Reporting & Analytics',
    slug: 'advanced-reporting-analytics',
    description: 'Dive deep into reporting features, custom dashboards, and business analytics.',
    category: 'advanced-features',
    type: 'interactive',
    difficulty: 'advanced',
    estimatedTime: 35,
    content: `# Advanced Reporting & Analytics

Unlock the full potential of your business data with advanced reporting features.

## What You'll Learn
- Creating custom reports
- Dashboard customization
- Key performance indicators (KPIs)
- Data export and sharing
- Automated reporting

## Advanced Topics
1. **Custom Dashboards**: Building your perfect view
2. **Report Scheduling**: Automated delivery
3. **Data Filtering**: Finding exactly what you need
4. **Trend Analysis**: Understanding patterns
5. **Performance Metrics**: Measuring success

## Business Intelligence
- Revenue tracking and forecasting
- Team performance analysis
- Customer satisfaction metrics
- Operational efficiency insights`,
    tags: ['reporting', 'analytics', 'dashboard', 'business-intelligence'],
    viewCount: 0,
    averageRating: 0,
    totalRatings: 0,
    prerequisites: ['creating-first-project', 'gps-tracking-mobile']
  },
  {
    title: 'Team Management & Permissions',
    slug: 'team-management-permissions',
    description: 'Learn how to manage team members, set permissions, and organize your workforce.',
    category: 'admin-management',
    type: 'documentation',
    difficulty: 'intermediate',
    estimatedTime: 30,
    content: `# Team Management & Permissions

Effectively manage your team with proper permissions and role assignments.

## What You'll Learn
- Adding and managing team members
- Setting up role-based permissions
- Organizing teams and departments
- Access control and security
- Performance monitoring

## Permission Levels
1. **Admin**: Full system access
2. **Manager**: Team and project management
3. **Field Worker**: Mobile and task access
4. **Office Staff**: Customer and office functions
5. **Viewer**: Read-only access

## Best Practices
- Follow the principle of least privilege
- Regular permission audits
- Clear role definitions
- Training and onboarding
- Security awareness`,
    tags: ['team', 'permissions', 'admin', 'security'],
    viewCount: 0,
    averageRating: 0,
    totalRatings: 0,
    prerequisites: ['account-setup-first-login']
  }
];

async function createTutorialData() {
  try {
    await client.connect();
    console.log('Connected to database');

    // First, check if we're in the right organization context
    const orgResult = await client.query('SELECT id FROM organizations LIMIT 1');
    const organizationId = orgResult.rows[0]?.id || 1;
    
    console.log(`Using organization ID: ${organizationId}`);

    // Insert tutorial categories
    console.log('Creating tutorial categories...');
    for (const category of tutorialCategories) {
      await client.query(`
        INSERT INTO tutorial_categories (name, slug, description, icon, color, sort_order, organization_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (slug, organization_id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          icon = EXCLUDED.icon,
          color = EXCLUDED.color,
          sort_order = EXCLUDED.sort_order
      `, [
        category.name,
        category.slug,
        category.description,
        category.icon,
        category.color,
        category.sortOrder,
        organizationId
      ]);
    }

    // Insert tutorials
    console.log('Creating tutorials...');
    for (const tutorial of tutorials) {
      const result = await client.query(`
        INSERT INTO tutorials (
          title, slug, description, category, type, difficulty, 
          estimated_time, content, tags, view_count, average_rating, 
          total_ratings, prerequisites, organization_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (slug, organization_id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          content = EXCLUDED.content,
          updated_at = NOW()
        RETURNING id
      `, [
        tutorial.title,
        tutorial.slug,
        tutorial.description,
        tutorial.category,
        tutorial.type,
        tutorial.difficulty,
        tutorial.estimatedTime,
        tutorial.content,
        tutorial.tags,
        tutorial.viewCount,
        tutorial.averageRating,
        tutorial.totalRatings,
        tutorial.prerequisites,
        organizationId
      ]);
      
      console.log(`Created tutorial: ${tutorial.title} (ID: ${result.rows[0]?.id})`);
    }

    console.log('Tutorial data created successfully!');
    
  } catch (error) {
    console.error('Error creating tutorial data:', error);
  } finally {
    await client.end();
  }
}

createTutorialData();