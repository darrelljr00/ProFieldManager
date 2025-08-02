import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Upload, Cloud, HardDrive, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface S3Status {
  configured: boolean;
  message: string;
}

interface MigrationResult {
  migrated: number;
  failed: number;
  results: Array<{
    fileId: number;
    fileName: string;
    success: boolean;
    error?: string;
    s3Key?: string;
    s3Url?: string;
  }>;
}

export function FileStorageManager() {
  const [s3Status, setS3Status] = useState<S3Status | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
  const [migrationProgress, setMigrationProgress] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    checkS3Status();
  }, []);

  const checkS3Status = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/files/s3-status');
      const data = await response.json();
      setS3Status(data);
    } catch (error) {
      console.error('Failed to check S3 status:', error);
      toast({
        title: "Error",
        description: "Failed to check S3 configuration status",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  const runMigration = async () => {
    if (!s3Status?.configured) {
      toast({
        title: "AWS S3 Not Configured",
        description: "Please configure AWS credentials before running migration",
        variant: "destructive",
      });
      return;
    }

    setIsMigrating(true);
    setMigrationProgress(0);

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setMigrationProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/files/migrate-to-s3', {
        method: 'POST',
      });

      clearInterval(progressInterval);
      setMigrationProgress(100);

      if (!response.ok) {
        throw new Error(`Migration failed: ${response.statusText}`);
      }

      const result = await response.json();
      setMigrationResult(result);

      toast({
        title: "Migration Complete",
        description: `Successfully migrated ${result.migrated} files to AWS S3`,
      });

    } catch (error) {
      console.error('Migration failed:', error);
      toast({
        title: "Migration Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsMigrating(false);
      setMigrationProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            File Storage Configuration
          </CardTitle>
          <CardDescription>
            Manage file storage settings and migrate to permanent cloud storage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* S3 Status */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">AWS S3 Configuration</h3>
              <p className="text-sm text-muted-foreground">
                {isChecking ? 'Checking configuration...' : s3Status?.message}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={s3Status?.configured ? 'default' : 'secondary'}>
                {s3Status?.configured ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Configured
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Not Configured
                  </>
                )}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={checkS3Status}
                disabled={isChecking}
              >
                <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {/* File Storage Status */}
          <Alert>
            <HardDrive className="h-4 w-4" />
            <AlertTitle>Current File Storage</AlertTitle>
            <AlertDescription>
              {s3Status?.configured 
                ? "New files will be stored permanently in AWS S3. Existing files can be migrated below."
                : "Files are currently stored in temporary local storage and may disappear during container restarts."
              }
            </AlertDescription>
          </Alert>

          {/* Migration Section */}
          {s3Status?.configured && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Migrate Existing Files to S3</h3>
                  <p className="text-sm text-muted-foreground">
                    Move existing files from local storage to permanent AWS S3 storage
                  </p>
                </div>
                <Button
                  onClick={runMigration}
                  disabled={isMigrating}
                  className="flex items-center gap-2"
                >
                  {isMigrating ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Migrating...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Start Migration
                    </>
                  )}
                </Button>
              </div>

              {isMigrating && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Migration Progress</span>
                    <span>{migrationProgress}%</span>
                  </div>
                  <Progress value={migrationProgress} />
                </div>
              )}

              {migrationResult && (
                <div className="space-y-2">
                  <h4 className="font-medium">Migration Results</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {migrationResult.migrated}
                      </div>
                      <div className="text-muted-foreground">Files Migrated</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {migrationResult.failed}
                      </div>
                      <div className="text-muted-foreground">Failed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {migrationResult.results.length}
                      </div>
                      <div className="text-muted-foreground">Total Processed</div>
                    </div>
                  </div>

                  {migrationResult.failed > 0 && (
                    <div className="space-y-2">
                      <h5 className="font-medium text-red-600">Failed Files</h5>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {migrationResult.results
                          .filter(r => !r.success)
                          .map((result, index) => (
                            <div key={index} className="text-xs bg-red-50 dark:bg-red-900/20 p-2 rounded">
                              <div className="font-medium">{result.fileName}</div>
                              <div className="text-muted-foreground">{result.error}</div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Configuration Instructions */}
          {!s3Status?.configured && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Setup AWS S3 for Permanent Storage</AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-1 text-sm">
                  <p>To enable permanent file storage, configure these environment variables:</p>
                  <ul className="list-disc list-inside ml-4 space-y-1">
                    <li><code>AWS_ACCESS_KEY_ID</code> - Your AWS access key</li>
                    <li><code>AWS_SECRET_ACCESS_KEY</code> - Your AWS secret key</li>
                    <li><code>AWS_S3_BUCKET_NAME</code> - Your S3 bucket name</li>
                    <li><code>AWS_REGION</code> - AWS region (e.g., us-east-1)</li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}