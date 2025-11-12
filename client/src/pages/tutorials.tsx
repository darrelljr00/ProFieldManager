import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  Play, 
  Clock, 
  Star, 
  CheckCircle2, 
  User, 
  Video, 
  FileText, 
  Search,
  Filter,
  Trophy,
  Target,
  Activity,
  HelpCircle,
  Zap
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { HelpDocumentation } from "@/components/help-documentation";
import { WalkthroughPlayer, BUILTIN_WALKTHROUGHS, InteractiveWalkthrough } from "@/components/interactive-walkthrough";
import { walkthroughsByCategory } from "@/data/walkthroughs";

interface Tutorial {
  id: number;
  title: string;
  slug: string;
  description: string;
  category: string;
  type: 'video' | 'interactive' | 'documentation';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number;
  videoUrl?: string;
  videoThumbnail?: string;
  interactiveSteps?: any[];
  content?: string;
  tags: string[];
  viewCount: number;
  averageRating: number;
  totalRatings: number;
  prerequisites: string[];
  createdAt: string;
  updatedAt: string;
}

interface TutorialProgress {
  id: number;
  tutorialId: number;
  status: 'not_started' | 'in_progress' | 'completed';
  currentStep: number;
  completedSteps: number[];
  startedAt?: string;
  completedAt?: string;
  timeSpent: number;
  rating?: number;
  feedback?: string;
  tutorial: {
    id: number;
    title: string;
    category: string;
    type: string;
    difficulty: string;
    estimatedTime: number;
  };
}

interface TutorialCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  sortOrder: number;
}

interface TutorialStats {
  totalTutorials: number;
  completedTutorials: number;
  inProgressTutorials: number;
  totalTimeSpent: number;
  averageRating: number;
}

export default function TutorialsPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("browse");
  const [showHelp, setShowHelp] = useState(false);
  const [activeWalkthrough, setActiveWalkthrough] = useState<string | null>(null);

  // Fetch tutorials
  const { data: tutorials = [], isLoading: tutorialsLoading } = useQuery({
    queryKey: ["/api/tutorials", { organizationId: user?.organizationId }],
    enabled: !!user,
  });

  // Fetch tutorial categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/tutorial-categories", { organizationId: user?.organizationId }],
    enabled: !!user,
  });

  // Fetch user progress
  const { data: userProgress = [] } = useQuery({
    queryKey: ["/api/tutorial-progress"],
    enabled: !!user,
  });

  // Fetch user stats
  const { data: userStats } = useQuery({
    queryKey: ["/api/tutorial-stats"],
    enabled: !!user,
  });

  // Start tutorial mutation
  const startTutorialMutation = useMutation({
    mutationFn: (tutorialId: number) => 
      apiRequest(`/api/tutorial-progress/start`, {
        method: "POST",
        body: { tutorialId },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutorial-progress"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tutorial-stats"] });
    },
  });

  // Filter tutorials based on search and filters
  const filteredTutorials = tutorials.filter((tutorial: Tutorial) => {
    const matchesSearch = tutorial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tutorial.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         tutorial.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = selectedCategory === "all" || tutorial.category === selectedCategory;
    const matchesDifficulty = selectedDifficulty === "all" || tutorial.difficulty === selectedDifficulty;
    const matchesType = selectedType === "all" || tutorial.type === selectedType;

    return matchesSearch && matchesCategory && matchesDifficulty && matchesType;
  });

  // Get progress for a specific tutorial
  const getTutorialProgress = (tutorialId: number): TutorialProgress | undefined => {
    return userProgress.find((progress: TutorialProgress) => progress.tutorialId === tutorialId);
  };

  // Calculate completion percentage
  const getCompletionPercentage = (progress: TutorialProgress): number => {
    if (progress.status === 'completed') return 100;
    if (progress.status === 'not_started') return 0;
    
    // For interactive tutorials, use completed steps
    if (progress.tutorial.type === 'interactive' && progress.completedSteps) {
      const totalSteps = progress.completedSteps.length + (progress.currentStep || 0);
      return totalSteps > 0 ? (progress.completedSteps.length / totalSteps) * 100 : 0;
    }
    
    // For other types, estimate based on time spent
    const estimatedTime = progress.tutorial.estimatedTime * 60; // Convert to seconds
    return estimatedTime > 0 ? Math.min((progress.timeSpent / estimatedTime) * 100, 90) : 0;
  };

  const handleStartTutorial = (tutorialId: number) => {
    startTutorialMutation.mutate(tutorialId);
  };

  const handleStartWalkthrough = (walkthroughId: string) => {
    setActiveWalkthrough(walkthroughId);
  };

  const handleWalkthroughComplete = () => {
    setActiveWalkthrough(null);
  };

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
      case 'interactive': return Play;
      case 'documentation': return FileText;
      default: return BookOpen;
    }
  };

  // Render active walkthrough
  if (activeWalkthrough) {
    const walkthrough = BUILTIN_WALKTHROUGHS.find(w => w.id === activeWalkthrough);
    if (walkthrough) {
      return (
        <WalkthroughPlayer
          walkthrough={walkthrough}
          onComplete={handleWalkthroughComplete}
          onClose={handleWalkthroughComplete}
        />
      );
    }
  }

  return (
    <>
      <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Learning Center</h1>
            <p className="text-muted-foreground">
              Master Pro Field Manager with our comprehensive tutorial library
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowHelp(true)}
              className="flex items-center gap-2"
            >
              <HelpCircle className="w-4 h-4" />
              Help Documentation
            </Button>
            <div className="flex gap-2">
              <Button
                onClick={() => handleStartWalkthrough('dashboard-tour')}
                className="flex items-center gap-2"
              >
                <Zap className="w-4 h-4" />
                Dashboard Tour
              </Button>
              <Button
                variant="outline"
                onClick={() => handleStartWalkthrough('create-customer')}
                className="flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                Create Customer
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* User Stats */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">{userStats.totalTutorials || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-xl font-bold">{userStats.completedTutorials || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="w-5 h-5 text-orange-600" />
                <div>
                  <p className="text-sm text-muted-foreground">In Progress</p>
                  <p className="text-xl font-bold">{userStats.inProgressTutorials || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-purple-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Time Spent</p>
                  <p className="text-xl font-bold">{Math.round((userStats.totalTimeSpent || 0) / 60)}m</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                  <p className="text-xl font-bold">{(userStats.averageRating || 0).toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="browse">Browse Tutorials</TabsTrigger>
          <TabsTrigger value="walkthroughs">Interactive Tours</TabsTrigger>
          <TabsTrigger value="progress">My Progress</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tutorials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category: TutorialCategory) => (
                  <SelectItem key={category.id} value={category.slug}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Difficulty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="beginner">Beginner</SelectItem>
                <SelectItem value="intermediate">Intermediate</SelectItem>
                <SelectItem value="advanced">Advanced</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="interactive">Interactive</SelectItem>
                <SelectItem value="documentation">Documentation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tutorials Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutorialsLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </CardHeader>
                  <CardContent>
                    <div className="h-20 bg-muted rounded mb-4"></div>
                    <div className="h-8 bg-muted rounded"></div>
                  </CardContent>
                </Card>
              ))
            ) : filteredTutorials.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No tutorials found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            ) : (
              filteredTutorials.map((tutorial: Tutorial) => {
                const progress = getTutorialProgress(tutorial.id);
                const TypeIcon = getTypeIcon(tutorial.type);
                
                return (
                  <Card key={tutorial.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">{tutorial.title}</CardTitle>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={getDifficultyColor(tutorial.difficulty)}>
                              {tutorial.difficulty}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <TypeIcon className="w-3 h-3" />
                              {tutorial.type}
                            </Badge>
                          </div>
                        </div>
                        {progress?.status === 'completed' && (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                        {tutorial.description}
                      </p>
                      
                      <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {tutorial.estimatedTime}min
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {tutorial.viewCount} views
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4" />
                          {tutorial.averageRating.toFixed(1)}
                        </div>
                      </div>
                      
                      {progress && progress.status !== 'not_started' && (
                        <div className="mb-4">
                          <div className="flex justify-between text-sm mb-1">
                            <span>Progress</span>
                            <span>{Math.round(getCompletionPercentage(progress))}%</span>
                          </div>
                          <Progress value={getCompletionPercentage(progress)} className="h-2" />
                        </div>
                      )}
                      
                      <Button
                        onClick={() => handleStartTutorial(tutorial.id)}
                        disabled={startTutorialMutation.isPending}
                        className="w-full"
                        variant={progress?.status === 'completed' ? 'outline' : 'default'}
                      >
                        {progress?.status === 'completed' ? 'Review' : 
                         progress?.status === 'in_progress' ? 'Continue' : 'Start'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="walkthroughs" className="space-y-6">
          {/* Core Walkthroughs Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">Quick Start Walkthroughs</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              <Button
                variant="outline"
                onClick={() => handleStartWalkthrough('dashboard-tour')}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <Activity className="w-6 h-6" />
                <span className="text-sm">Dashboard</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleStartWalkthrough('create-customer')}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <User className="w-6 h-6" />
                <span className="text-sm">Add Customer</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleStartWalkthrough('create-invoice')}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <FileText className="w-6 h-6" />
                <span className="text-sm">Create Invoice</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleStartWalkthrough('create-task')}
                className="h-auto p-4 flex flex-col items-center gap-2"
              >
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-sm">Create Task</span>
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {walkthroughsByCategory.core.map((walkthrough) => (
                <Card key={walkthrough.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{walkthrough.title}</CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getDifficultyColor(walkthrough.difficulty)}>
                            {walkthrough.difficulty}
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Play className="w-3 h-3" />
                            Interactive
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {walkthrough.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {walkthrough.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {walkthrough.estimatedTime}min
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        {walkthrough.steps.length} steps
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleStartWalkthrough(walkthrough.id)}
                      className="w-full"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Walkthrough
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Advanced Technical Walkthroughs Section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-orange-600" />
              <h3 className="text-lg font-semibold">Advanced Technical Tutorials</h3>
              <Badge variant="destructive" className="text-xs">Admin Only</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              In-depth walkthroughs for advanced system features and technical configurations.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {walkthroughsByCategory.advanced.map((walkthrough) => (
                <Card key={walkthrough.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{walkthrough.title}</CardTitle>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getDifficultyColor(walkthrough.difficulty)}>
                            {walkthrough.difficulty}
                          </Badge>
                          <Badge variant="outline" className="flex items-center gap-1">
                            <Play className="w-3 h-3" />
                            Interactive
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {walkthrough.category}
                          </Badge>
                        </div>
                        {walkthrough.prerequisites && walkthrough.prerequisites.length > 0 && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Prerequisites: {walkthrough.prerequisites.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                      {walkthrough.description}
                    </p>
                    
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {walkthrough.estimatedTime}min
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        {walkthrough.steps.length} steps
                      </div>
                    </div>
                    
                    <Button
                      onClick={() => handleStartWalkthrough(walkthrough.id)}
                      className="w-full"
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start Walkthrough
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <div className="space-y-4">
            {userProgress.length === 0 ? (
              <div className="text-center py-12">
                <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No progress yet</h3>
                <p className="text-muted-foreground">
                  Start a tutorial to track your learning progress
                </p>
              </div>
            ) : (
              userProgress.map((progress: TutorialProgress) => (
                <Card key={progress.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{progress.tutorial.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {progress.tutorial.category} • {progress.tutorial.difficulty}
                        </p>
                      </div>
                      <Badge 
                        variant={progress.status === 'completed' ? 'default' : 'secondary'}
                        className={progress.status === 'completed' ? 'bg-green-600' : ''}
                      >
                        {progress.status === 'completed' ? 'Completed' : 
                         progress.status === 'in_progress' ? 'In Progress' : 'Not Started'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{Math.round(getCompletionPercentage(progress))}%</span>
                      </div>
                      <Progress value={getCompletionPercentage(progress)} className="h-2" />
                    </div>
                    
                    <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
                      <span>Time spent: {Math.round(progress.timeSpent / 60)}min</span>
                      {progress.rating && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span>{progress.rating}/5</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category: TutorialCategory) => {
              const categoryTutorials = tutorials.filter((t: Tutorial) => t.category === category.slug);
              
              return (
                <Card key={category.id} className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedCategory(category.slug);
                        setActiveTab('browse');
                      }}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: category.color }}
                      >
                        <BookOpen className="w-4 h-4" />
                      </div>
                      {category.name}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{categoryTutorials.length}</span>
                      <span className="text-sm text-muted-foreground">tutorials</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
      </div>
      
      {/* Help Documentation Modal */}
      <HelpDocumentation
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </>
  );
}