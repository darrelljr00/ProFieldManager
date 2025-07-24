import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  TrendingUp, 
  Users, 
  Target, 
  BarChart3, 
  FileText, 
  Plus,
  ExternalLink,
  Calendar,
  MapPin,
  DollarSign,
  Lightbulb
} from "lucide-react";

interface MarketData {
  id: number;
  category: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  source: string;
  date: string;
}

interface CompetitorData {
  id: number;
  name: string;
  location: string;
  services: string[];
  pricing: string;
  rating: number;
  website: string;
  notes: string;
}

const sampleMarketData: MarketData[] = [
  {
    id: 1,
    category: "Local Service Demand",
    value: "78% increase",
    change: "+12%",
    trend: 'up',
    source: "Google Trends",
    date: "2025-07-24"
  },
  {
    id: 2,
    category: "Average Service Price",
    value: "$150-$300",
    change: "+5%",
    trend: 'up',
    source: "Market Analysis",
    date: "2025-07-20"
  },
  {
    id: 3,
    category: "Seasonal Peak",
    value: "March-September",
    change: "Stable",
    trend: 'stable',
    source: "Industry Report",
    date: "2025-07-15"
  }
];

const sampleCompetitors: CompetitorData[] = [
  {
    id: 1,
    name: "CleanPro Services",
    location: "Austin, TX",
    services: ["Pressure Washing", "Roof Cleaning", "Gutter Cleaning"],
    pricing: "$200-$400",
    rating: 4.5,
    website: "cleanpro.com",
    notes: "Strong online presence, focuses on residential"
  },
  {
    id: 2,
    name: "Elite Wash Co",
    location: "Austin, TX", 
    services: ["Fleet Washing", "Commercial Cleaning"],
    pricing: "$300-$600",
    rating: 4.2,
    website: "elitewash.com",
    notes: "Commercial focused, premium pricing"
  }
];

export default function MarketResearch() {
  const [activeTab, setActiveTab] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [newCompetitor, setNewCompetitor] = useState({
    name: "",
    location: "",
    services: "",
    pricing: "",
    rating: "",
    website: "",
    notes: ""
  });

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />;
      default:
        return <BarChart3 className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up':
        return 'text-green-600 bg-green-50';
      case 'down':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Market Research</h1>
          <p className="text-muted-foreground">
            Analyze market trends, competitor intelligence, and business opportunities
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Research
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="trends">Market Trends</TabsTrigger>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Market Size</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$2.4M</div>
                <p className="text-xs text-muted-foreground">Local market potential</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Competitors</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sampleCompetitors.length}</div>
                <p className="text-xs text-muted-foreground">Active competitors tracked</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Market Share</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12%</div>
                <p className="text-xs text-muted-foreground">Estimated current share</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">+18%</div>
                <p className="text-xs text-muted-foreground">Year over year</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent Market Data</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sampleMarketData.map((data) => (
                    <div key={data.id} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{data.category}</p>
                        <p className="text-xs text-muted-foreground">{data.source} • {data.date}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={getTrendColor(data.trend)}>
                          {getTrendIcon(data.trend)}
                          {data.value}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Competitors</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sampleCompetitors.slice(0, 3).map((competitor) => (
                    <div key={competitor.id} className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{competitor.name}</p>
                        <div className="flex items-center gap-2">
                          <MapPin className="h-3 w-3 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">{competitor.location}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{competitor.pricing}</p>
                        <p className="text-xs text-muted-foreground">⭐ {competitor.rating}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search competitors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Competitor
            </Button>
          </div>

          <div className="grid gap-4">
            {sampleCompetitors.map((competitor) => (
              <Card key={competitor.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{competitor.name}</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {competitor.location}
                        <ExternalLink className="h-4 w-4 ml-2" />
                        <a href={`https://${competitor.website}`} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {competitor.website}
                        </a>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold">{competitor.pricing}</p>
                      <p className="text-sm text-muted-foreground">⭐ {competitor.rating}/5</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm font-medium">Services</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {competitor.services.map((service, index) => (
                          <Badge key={index} variant="secondary">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    {competitor.notes && (
                      <div>
                        <Label className="text-sm font-medium">Notes</Label>
                        <p className="text-sm text-muted-foreground mt-1">{competitor.notes}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Market Trends Analysis</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track industry trends and seasonal patterns
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {sampleMarketData.map((data) => (
                  <div key={data.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{data.category}</h3>
                      <Badge variant="outline" className={getTrendColor(data.trend)}>
                        {getTrendIcon(data.trend)}
                        {data.change}
                      </Badge>
                    </div>
                    <p className="text-lg font-medium mb-2">{data.value}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>Source: {data.source}</span>
                      <span>•</span>
                      <span>Updated: {data.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="opportunities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Market Opportunities</CardTitle>
              <p className="text-sm text-muted-foreground">
                Identify growth opportunities and market gaps
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <h3 className="font-semibold">Underserved Commercial Market</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Only 2 competitors focus on commercial fleet washing. High demand with 40+ local businesses.
                      </p>
                      <Badge className="mt-2" variant="outline">High Priority</Badge>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <h3 className="font-semibold">Premium Service Gap</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        No competitors offer eco-friendly premium services. Growing demand from environmentally conscious customers.
                      </p>
                      <Badge className="mt-2" variant="outline">Medium Priority</Badge>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <h3 className="font-semibold">Seasonal Contract Opportunities</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Most competitors don't offer annual maintenance contracts. Opportunity for recurring revenue.
                      </p>
                      <Badge className="mt-2" variant="outline">Medium Priority</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}