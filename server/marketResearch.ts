import { Router } from "express";
import { requireAuth } from "./auth";

const router = Router();

// Market research service keywords and data
const SERVICE_KEYWORDS = {
  "pressure washing": {
    primaryKeywords: [
      { keyword: "pressure washing", volume: 2400, cpc: 3.50, competition: "medium" },
      { keyword: "power washing", volume: 1800, cpc: 3.20, competition: "medium" },
      { keyword: "house washing", volume: 1200, cpc: 4.10, competition: "high" },
      { keyword: "deck cleaning", volume: 800, cpc: 2.90, competition: "low" }
    ],
    trend: "up",
    growth: "+18%",
    seasonality: "Peak: March-October (Spring/Summer)",
    avgServicePrice: "$150-$400"
  },
  "fleet washing": {
    primaryKeywords: [
      { keyword: "fleet washing", volume: 880, cpc: 4.50, competition: "low" },
      { keyword: "truck washing", volume: 1400, cpc: 3.80, competition: "medium" },
      { keyword: "commercial vehicle cleaning", volume: 520, cpc: 5.20, competition: "low" }
    ],
    trend: "up",
    growth: "+25%",
    seasonality: "Year-round consistent demand",
    avgServicePrice: "$200-$600"
  },
  "roof cleaning": {
    primaryKeywords: [
      { keyword: "roof cleaning", volume: 1200, cpc: 4.80, competition: "medium" },
      { keyword: "roof washing", volume: 900, cpc: 4.20, competition: "medium" },
      { keyword: "moss removal", volume: 600, cpc: 3.60, competition: "low" }
    ],
    trend: "stable",
    growth: "+3%",
    seasonality: "Peak: April-September",
    avgServicePrice: "$300-$800"
  },
  "commercial cleaning": {
    primaryKeywords: [
      { keyword: "commercial cleaning", volume: 3600, cpc: 6.20, competition: "high" },
      { keyword: "office cleaning", volume: 2800, cpc: 5.50, competition: "high" },
      { keyword: "janitorial services", volume: 2200, cpc: 4.90, competition: "high" }
    ],
    trend: "up", 
    growth: "+15%",
    seasonality: "Consistent year-round demand",
    avgServicePrice: "$100-$500"
  }
};

// Location-based market data
const LOCATION_MULTIPLIERS = {
  "texas": { multiplier: 1.2, population: 30000000, businessCount: 2800000 },
  "california": { multiplier: 1.5, population: 39000000, businessCount: 4200000 },
  "florida": { multiplier: 1.3, population: 22000000, businessCount: 2500000 },
  "new york": { multiplier: 1.4, population: 19000000, businessCount: 2100000 }
};

// Get market demand data based on niche and location
router.get("/api/market-research/demand", requireAuth, async (req, res) => {
  try {
    const { niche, location } = req.query;
    
    if (!niche || !location) {
      return res.status(400).json({ message: "Niche and location are required" });
    }

    const nicheKey = (niche as string).toLowerCase();
    const locationKey = (location as string).toLowerCase();
    
    const serviceData = SERVICE_KEYWORDS[nicheKey as keyof typeof SERVICE_KEYWORDS] || SERVICE_KEYWORDS["pressure washing"];
    const locationData = LOCATION_MULTIPLIERS[locationKey as keyof typeof LOCATION_MULTIPLIERS] || LOCATION_MULTIPLIERS["texas"];
    
    // Calculate adjusted search volumes based on location
    const adjustedKeywords = serviceData.primaryKeywords.map(keyword => ({
      ...keyword,
      adjustedVolume: Math.round(keyword.volume * locationData.multiplier),
      localCompetition: keyword.competition
    }));
    
    // Calculate total market potential
    const totalSearchVolume = adjustedKeywords.reduce((sum, keyword) => sum + keyword.adjustedVolume, 0);
    const estimatedMarketSize = Math.round((totalSearchVolume * 12 * parseFloat(serviceData.avgServicePrice.split('-')[0].replace('$', ''))) / 1000);
    
    const marketData = {
      niche: niche,
      location: location,
      totalSearchVolume,
      estimatedMarketSize: `$${estimatedMarketSize}K`,
      growth: serviceData.growth,
      trend: serviceData.trend,
      seasonality: serviceData.seasonality,
      keywords: adjustedKeywords,
      competitionLevel: adjustedKeywords.reduce((acc, k) => {
        if (k.competition === 'high') return acc + 3;
        if (k.competition === 'medium') return acc + 2;
        return acc + 1;
      }, 0) / adjustedKeywords.length > 2 ? 'High' : 'Medium',
      lastUpdated: new Date().toISOString()
    };
    
    res.json(marketData);
  } catch (error) {
    console.error("Error fetching market demand data:", error);
    res.status(500).json({ message: "Failed to fetch market research data" });
  }
});

// Get competitor analysis
router.get("/api/market-research/competitors", requireAuth, async (req, res) => {
  try {
    const { niche, location } = req.query;
    
    if (!niche || !location) {
      return res.status(400).json({ message: "Niche and location are required" });
    }

    // Simulate competitor data based on niche and location
    const competitors = [
      {
        id: 1,
        name: `${location} Pro ${niche}`,
        location: location,
        services: [niche, "Maintenance", "Emergency Service"],
        pricing: "$200-$400",
        rating: 4.3,
        website: `${niche.replace(' ', '')}.com`,
        estimatedRevenue: "$500K-$1M",
        marketShare: "15%",
        strengths: ["Established brand", "Large service area"],
        weaknesses: ["Higher pricing", "Limited online presence"]
      },
      {
        id: 2,
        name: `Elite ${niche} Services`,
        location: location,
        services: [niche, "Commercial", "Residential"],
        pricing: "$150-$350",
        rating: 4.1,
        website: `elite${niche.replace(' ', '')}.com`,
        estimatedRevenue: "$300K-$600K",
        marketShare: "12%",
        strengths: ["Competitive pricing", "Good reviews"],
        weaknesses: ["Smaller team", "Limited equipment"]
      }
    ];
    
    res.json({
      competitors,
      totalCompetitors: competitors.length,
      marketConcentration: "Moderate - Opportunity exists",
      competitiveGaps: [
        "Premium eco-friendly services",
        "24/7 emergency response",
        "Subscription-based maintenance"
      ]
    });
  } catch (error) {
    console.error("Error fetching competitor data:", error);
    res.status(500).json({ message: "Failed to fetch competitor analysis" });
  }
});

// Get market opportunities
router.get("/api/market-research/opportunities", requireAuth, async (req, res) => {
  try {
    const { niche, location } = req.query;
    
    const opportunities = [
      {
        id: 1,
        title: "Underserved Commercial Market",
        description: `High demand for ${niche} services with limited competitors focusing on commercial clients`,
        priority: "High",
        estimatedRevenue: "$200K-$500K",
        timeframe: "3-6 months",
        requirements: ["Commercial equipment", "Insurance upgrade", "Marketing campaign"]
      },
      {
        id: 2,
        title: "Subscription Service Model",
        description: "Monthly/quarterly maintenance contracts for recurring revenue",
        priority: "Medium",
        estimatedRevenue: "$150K-$300K",
        timeframe: "2-4 months",
        requirements: ["Service scheduling system", "Customer management", "Contract templates"]
      },
      {
        id: 3,
        title: "Eco-Friendly Premium Services",
        description: "Growing demand for environmentally conscious cleaning solutions",
        priority: "Medium",
        estimatedRevenue: "$100K-$250K",
        timeframe: "1-3 months",
        requirements: ["Eco-friendly supplies", "Certification", "Premium pricing strategy"]
      }
    ];
    
    res.json({
      opportunities,
      totalOpportunities: opportunities.length,
      recommendedFocus: "Commercial market expansion with subscription model"
    });
  } catch (error) {
    console.error("Error fetching market opportunities:", error);
    res.status(500).json({ message: "Failed to fetch market opportunities" });
  }
});

export default router;