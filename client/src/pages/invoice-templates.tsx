import React, { useState } from 'react';
import { InvoicePreview } from '@/components/InvoicePreview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const templates = [
  { id: 'classic', name: 'Classic Professional', color: '#1f2937', description: 'Traditional business invoice with professional styling' },
  { id: 'modern', name: 'Modern Minimal', color: '#6b7280', description: 'Clean, contemporary design with minimal elements' },
  { id: 'corporate', name: 'Corporate Blue', color: '#2563eb', description: 'Professional corporate styling with blue accents' },
  { id: 'elegant', name: 'Elegant Gray', color: '#374151', description: 'Sophisticated appearance with refined typography' },
  { id: 'creative', name: 'Creative Colorful', color: '#7c3aed', description: 'Modern, vibrant design for creative businesses' },
  { id: 'simple', name: 'Simple Clean', color: '#059669', description: 'Minimalist approach with green accent color' },
  { id: 'bold', name: 'Bold Statement', color: '#dc2626', description: 'Eye-catching design with strong visual impact' },
  { id: 'luxury', name: 'Luxury Gold', color: '#d97706', description: 'Premium appearance with gold accents' },
  { id: 'tech', name: 'Tech Gradient', color: '#0891b2', description: 'Modern tech aesthetic with cyan styling' },
  { id: 'vintage', name: 'Vintage Style', color: '#92400e', description: 'Classic, timeless look with brown tones' }
];

export default function InvoiceTemplates() {
  const [selectedTemplate, setSelectedTemplate] = useState('classic');
  const [logoPosition, setLogoPosition] = useState('top-left');
  const [showSquareFeet, setShowSquareFeet] = useState(false);
  const [squareFeetLabel, setSquareFeetLabel] = useState('Square Feet');

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Invoice Templates</h1>
        <p className="text-muted-foreground mt-2">
          Choose from 10 professional invoice templates and customize their appearance
        </p>
      </div>

      <Tabs defaultValue="gallery" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="gallery">Template Gallery</TabsTrigger>
          <TabsTrigger value="customizer">Template Customizer</TabsTrigger>
        </TabsList>

        <TabsContent value="gallery" className="space-y-6">
          <div className="grid gap-6">
            {templates.map((template) => (
              <Card key={template.id} className="overflow-hidden">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-3">
                        <div 
                          className="w-6 h-6 rounded"
                          style={{ backgroundColor: template.color }}
                        />
                        {template.name}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {template.description}
                      </CardDescription>
                    </div>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setSelectedTemplate(template.id);
                        document.querySelector('[value="customizer"]')?.click();
                      }}
                    >
                      Customize This Template
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <InvoicePreview 
                      template={template.id}
                      logoPosition="top-left"
                      showSquareFeet={false}
                      squareFeetLabel="Square Feet"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="customizer" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Customization Controls */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Template Settings</CardTitle>
                  <CardDescription>
                    Customize your invoice template appearance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Template Selection */}
                  <div className="space-y-2">
                    <Label>Template</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {templates.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-4 h-4 rounded"
                                style={{ backgroundColor: template.color }}
                              />
                              {template.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Logo Position */}
                  <div className="space-y-2">
                    <Label>Logo Position</Label>
                    <Select value={logoPosition} onValueChange={setLogoPosition}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="top-left">Top Left</SelectItem>
                        <SelectItem value="top-center">Top Center</SelectItem>
                        <SelectItem value="top-right">Top Right</SelectItem>
                        <SelectItem value="bottom-left">Bottom Left</SelectItem>
                        <SelectItem value="bottom-center">Bottom Center</SelectItem>
                        <SelectItem value="bottom-right">Bottom Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Square Feet Field */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="showSquareFeet"
                        checked={showSquareFeet}
                        onCheckedChange={setShowSquareFeet}
                      />
                      <Label htmlFor="showSquareFeet">Include Square Feet Field</Label>
                    </div>
                    
                    {showSquareFeet && (
                      <div className="space-y-2">
                        <Label>Square Feet Field Label</Label>
                        <Input
                          value={squareFeetLabel}
                          onChange={(e) => setSquareFeetLabel(e.target.value)}
                          placeholder="Square Feet"
                        />
                      </div>
                    )}
                  </div>

                  {/* Template Info */}
                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">
                      {templates.find(t => t.id === selectedTemplate)?.name}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {templates.find(t => t.id === selectedTemplate)?.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Live Preview */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Live Preview</CardTitle>
                  <CardDescription>
                    See how your invoice will look with the selected template and settings
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg overflow-hidden">
                    <InvoicePreview 
                      template={selectedTemplate}
                      logoPosition={logoPosition}
                      showSquareFeet={showSquareFeet}
                      squareFeetLabel={squareFeetLabel}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}