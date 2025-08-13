import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  Plus,
  Settings,
  Edit,
  ArrowLeft
} from "lucide-react";
import { Link } from "wouter";

export default function SaasAdminCallManager() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/saas-admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to SaaS Admin
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Phone className="h-8 w-8" />
              Call Manager Administration
            </h1>
            <p className="text-muted-foreground">Manage phone numbers and call settings for all organizations</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Phone Number Provisioning */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Phone Number Management
            </CardTitle>
            <CardDescription>
              Manage phone numbers for organizations and configure calling settings
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Numbers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">47</div>
                  <p className="text-xs text-muted-foreground">+3 this month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Active Lines</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">42</div>
                  <p className="text-xs text-muted-foreground">5 inactive</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Monthly Usage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">1,247</div>
                  <p className="text-xs text-muted-foreground">minutes used</p>
                </CardContent>
              </Card>
            </div>
            
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Organization Phone Numbers</h3>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Provision Number
              </Button>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Monthly Cost</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>Texas Power Wash</TableCell>
                  <TableCell>(555) 123-4567</TableCell>
                  <TableCell>
                    <Badge variant="outline">Local</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">Active</Badge>
                  </TableCell>
                  <TableCell>$12.99</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Houston Contractors</TableCell>
                  <TableCell>(713) 555-0123</TableCell>
                  <TableCell>
                    <Badge variant="outline">Toll-Free</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default">Active</Badge>
                  </TableCell>
                  <TableCell>$24.99</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Elite Services</TableCell>
                  <TableCell>(832) 555-9876</TableCell>
                  <TableCell>
                    <Badge variant="outline">Local</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">Suspended</Badge>
                  </TableCell>
                  <TableCell>$12.99</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost">
                        <Settings className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Call Manager Settings */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Global Call Settings</CardTitle>
              <CardDescription>
                Platform-wide call management configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Call Recording</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable automatic call recording for all organizations
                  </p>
                </div>
                <Switch />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Call Transcription</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically transcribe recorded calls using AI
                  </p>
                </div>
                <Switch />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>International Calling</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow international calls for organizations
                  </p>
                </div>
                <Switch />
              </div>
              
              <div className="space-y-2">
                <Label>Maximum Call Duration (minutes)</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                    <SelectItem value="120">120 minutes</SelectItem>
                    <SelectItem value="unlimited">Unlimited</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage Analytics</CardTitle>
              <CardDescription>
                Call usage statistics across all organizations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">Total Calls Today</span>
                  <span className="font-semibold">23</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Average Call Duration</span>
                  <span className="font-semibold">4:32</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Success Rate</span>
                  <span className="font-semibold">94.2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm">Peak Usage</span>
                  <span className="font-semibold">2:00 PM</span>
                </div>
              </div>
              
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Top Organizations by Usage</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Texas Power Wash</span>
                    <span>127 min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Houston Contractors</span>
                    <span>89 min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Elite Services</span>
                    <span>34 min</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Billing & Cost Management */}
        <Card>
          <CardHeader>
            <CardTitle>Call Manager Billing</CardTitle>
            <CardDescription>
              Monitor and manage call-related costs and billing
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold">$1,247.89</div>
                <p className="text-sm text-muted-foreground">Total Monthly Revenue</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">$623.45</div>
                <p className="text-sm text-muted-foreground">Carrier Costs</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">$624.44</div>
                <p className="text-sm text-muted-foreground">Net Profit</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">50.0%</div>
                <p className="text-sm text-muted-foreground">Profit Margin</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <h4 className="font-semibold">Recent Billing Events</h4>
              <Button variant="outline" size="sm">View All</Button>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-semibold">Texas Power Wash - Monthly Bill</p>
                  <p className="text-sm text-muted-foreground">Phone: (555) 123-4567 • 127 minutes</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">$31.49</p>
                  <p className="text-sm text-muted-foreground">Processed</p>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-semibold">Houston Contractors - Monthly Bill</p>
                  <p className="text-sm text-muted-foreground">Phone: (713) 555-0123 • 89 minutes</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">$47.23</p>
                  <p className="text-sm text-muted-foreground">Processed</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}