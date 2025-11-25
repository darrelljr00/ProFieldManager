import { Router, Request, Response } from "express";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import { db } from "../db";
import { sql } from "drizzle-orm";

const execAsync = promisify(exec);
const router = Router();

interface DeploymentJob {
  id: number;
  jobId: string;
  organizationId: number;
  projectId: string;
  serverHost: string;
  serverUser: string;
  serverPort: number;
  remotePath: string;
  localBuildPath: string;
  status: string;
  logs: string;
  errorMessage: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const activeDeployments = new Map<string, {
  logs: string[];
  status: string;
  subscribers: Response[];
}>();

function generateJobId(): string {
  return `deploy-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

function verifyDeployToken(req: Request): boolean {
  const authHeader = req.headers.authorization;
  const deployToken = process.env.DEPLOY_API_TOKEN;
  
  if (!deployToken) {
    console.warn("DEPLOY_API_TOKEN not configured");
    return false;
  }
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }
  
  const token = authHeader.substring(7);
  return token === deployToken;
}

function addLog(jobId: string, message: string) {
  const deployment = activeDeployments.get(jobId);
  if (deployment) {
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}`;
    deployment.logs.push(logLine);
    
    deployment.subscribers.forEach(res => {
      res.write(`data: ${JSON.stringify({ type: 'log', message: logLine })}\n\n`);
    });
  }
}

function updateStatus(jobId: string, status: string) {
  const deployment = activeDeployments.get(jobId);
  if (deployment) {
    deployment.status = status;
    
    deployment.subscribers.forEach(res => {
      res.write(`data: ${JSON.stringify({ type: 'status', status })}\n\n`);
    });
  }
}

async function runDeployment(jobId: string, config: {
  serverHost: string;
  serverUser: string;
  serverPort: number;
  remotePath: string;
  localBuildPath: string;
  organizationId: number;
  projectId: string;
}) {
  const { serverHost, serverUser, serverPort, remotePath, localBuildPath, organizationId, projectId } = config;
  
  activeDeployments.set(jobId, {
    logs: [],
    status: 'running',
    subscribers: []
  });
  
  try {
    await db.execute(sql`
      UPDATE deployments 
      SET status = 'running', started_at = NOW(), updated_at = NOW()
      WHERE job_id = ${jobId}
    `);
    
    addLog(jobId, "Starting deployment...");
    addLog(jobId, `Target: ${serverUser}@${serverHost}:${remotePath}`);
    addLog(jobId, `Local build path: ${localBuildPath}`);
    
    const buildPath = path.resolve(localBuildPath);
    if (!fs.existsSync(buildPath)) {
      throw new Error(`Build path does not exist: ${buildPath}`);
    }
    
    addLog(jobId, "Build path verified.");
    
    const sshKeyPath = process.env.CWP_SSH_KEY_PATH || "/tmp/cwp_deploy_key";
    const sshKeyContent = process.env.CWP_SSH_PRIVATE_KEY;
    
    if (sshKeyContent) {
      fs.writeFileSync(sshKeyPath, sshKeyContent, { mode: 0o600 });
      addLog(jobId, "SSH key configured.");
    } else if (!fs.existsSync(sshKeyPath)) {
      throw new Error("SSH key not found. Set CWP_SSH_PRIVATE_KEY environment variable.");
    }
    
    addLog(jobId, "Testing SSH connection...");
    
    const sshTestCmd = `ssh -i "${sshKeyPath}" -o StrictHostKeyChecking=no -o ConnectTimeout=10 -p ${serverPort} ${serverUser}@${serverHost} "echo 'SSH connection successful'"`;
    
    try {
      const { stdout } = await execAsync(sshTestCmd);
      addLog(jobId, stdout.trim());
    } catch (sshError: any) {
      throw new Error(`SSH connection failed: ${sshError.message}`);
    }
    
    addLog(jobId, "Creating remote directory if needed...");
    const mkdirCmd = `ssh -i "${sshKeyPath}" -o StrictHostKeyChecking=no -p ${serverPort} ${serverUser}@${serverHost} "mkdir -p ${remotePath}"`;
    await execAsync(mkdirCmd);
    
    addLog(jobId, "Starting rsync transfer...");
    updateStatus(jobId, 'syncing');
    
    const rsyncCmd = `rsync -avz --progress --delete -e "ssh -i ${sshKeyPath} -o StrictHostKeyChecking=no -p ${serverPort}" ${buildPath}/ ${serverUser}@${serverHost}:${remotePath}/`;
    
    await new Promise<void>((resolve, reject) => {
      const rsyncProcess = spawn('rsync', [
        '-avz',
        '--progress',
        '--delete',
        '-e', `ssh -i ${sshKeyPath} -o StrictHostKeyChecking=no -p ${serverPort}`,
        `${buildPath}/`,
        `${serverUser}@${serverHost}:${remotePath}/`
      ]);
      
      rsyncProcess.stdout.on('data', (data) => {
        const lines = data.toString().split('\n').filter((line: string) => line.trim());
        lines.forEach((line: string) => addLog(jobId, line));
      });
      
      rsyncProcess.stderr.on('data', (data) => {
        const lines = data.toString().split('\n').filter((line: string) => line.trim());
        lines.forEach((line: string) => addLog(jobId, `[stderr] ${line}`));
      });
      
      rsyncProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`rsync exited with code ${code}`));
        }
      });
      
      rsyncProcess.on('error', (err) => {
        reject(err);
      });
    });
    
    addLog(jobId, "Rsync transfer completed successfully.");
    
    addLog(jobId, "Setting file permissions...");
    const chmodCmd = `ssh -i "${sshKeyPath}" -o StrictHostKeyChecking=no -p ${serverPort} ${serverUser}@${serverHost} "chmod -R 755 ${remotePath}"`;
    await execAsync(chmodCmd);
    addLog(jobId, "Permissions set.");
    
    addLog(jobId, "Deployment completed successfully!");
    updateStatus(jobId, 'success');
    
    const deployment = activeDeployments.get(jobId);
    const logs = deployment?.logs.join('\n') || '';
    
    await db.execute(sql`
      UPDATE deployments 
      SET status = 'success', completed_at = NOW(), logs = ${logs}, updated_at = NOW()
      WHERE job_id = ${jobId}
    `);
    
    deployment?.subscribers.forEach(res => {
      res.write(`data: ${JSON.stringify({ type: 'complete', status: 'success' })}\n\n`);
      res.end();
    });
    
  } catch (error: any) {
    const errorMessage = error.message || 'Unknown error';
    addLog(jobId, `ERROR: ${errorMessage}`);
    updateStatus(jobId, 'failed');
    
    const deployment = activeDeployments.get(jobId);
    const logs = deployment?.logs.join('\n') || '';
    
    await db.execute(sql`
      UPDATE deployments 
      SET status = 'failed', completed_at = NOW(), logs = ${logs}, error_message = ${errorMessage}, updated_at = NOW()
      WHERE job_id = ${jobId}
    `);
    
    deployment?.subscribers.forEach(res => {
      res.write(`data: ${JSON.stringify({ type: 'complete', status: 'failed', error: errorMessage })}\n\n`);
      res.end();
    });
  }
  
  setTimeout(() => {
    activeDeployments.delete(jobId);
  }, 3600000);
}

router.post("/api/deploy", async (req: Request, res: Response) => {
  try {
    if (!verifyDeployToken(req)) {
      return res.status(401).json({ error: "Unauthorized. Invalid or missing DEPLOY_API_TOKEN." });
    }
    
    const { 
      serverHost, 
      serverUser, 
      serverPort = 22, 
      remotePath, 
      localBuildPath,
      organizationId = 1,
      projectId = "default"
    } = req.body;
    
    if (!serverHost || !serverUser || !remotePath || !localBuildPath) {
      return res.status(400).json({ 
        error: "Missing required fields: serverHost, serverUser, remotePath, localBuildPath" 
      });
    }
    
    const jobId = generateJobId();
    
    await db.execute(sql`
      INSERT INTO deployments (job_id, organization_id, project_id, server_host, server_user, server_port, remote_path, local_build_path, status)
      VALUES (${jobId}, ${organizationId}, ${projectId}, ${serverHost}, ${serverUser}, ${serverPort}, ${remotePath}, ${localBuildPath}, 'pending')
    `);
    
    runDeployment(jobId, {
      serverHost,
      serverUser,
      serverPort,
      remotePath,
      localBuildPath,
      organizationId,
      projectId
    });
    
    res.json({
      success: true,
      jobId,
      message: "Deployment started",
      logsUrl: `/api/deploy/logs/${jobId}`
    });
    
  } catch (error: any) {
    console.error("Deploy error:", error);
    res.status(500).json({ error: error.message || "Deployment failed" });
  }
});

router.get("/api/deploy/logs/:jobId", (req: Request, res: Response) => {
  const { jobId } = req.params;
  
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  
  const deployment = activeDeployments.get(jobId);
  
  if (deployment) {
    deployment.logs.forEach(log => {
      res.write(`data: ${JSON.stringify({ type: 'log', message: log })}\n\n`);
    });
    
    res.write(`data: ${JSON.stringify({ type: 'status', status: deployment.status })}\n\n`);
    
    if (deployment.status === 'success' || deployment.status === 'failed') {
      res.write(`data: ${JSON.stringify({ type: 'complete', status: deployment.status })}\n\n`);
      res.end();
      return;
    }
    
    deployment.subscribers.push(res);
    
    req.on('close', () => {
      const idx = deployment.subscribers.indexOf(res);
      if (idx !== -1) {
        deployment.subscribers.splice(idx, 1);
      }
    });
  } else {
    db.execute(sql`SELECT * FROM deployments WHERE job_id = ${jobId}`)
      .then((result: any) => {
        const rows = result.rows || result;
        if (rows && rows.length > 0) {
          const dbDeployment = rows[0];
          if (dbDeployment.logs) {
            const logs = dbDeployment.logs.split('\n');
            logs.forEach((log: string) => {
              res.write(`data: ${JSON.stringify({ type: 'log', message: log })}\n\n`);
            });
          }
          res.write(`data: ${JSON.stringify({ type: 'status', status: dbDeployment.status })}\n\n`);
          res.write(`data: ${JSON.stringify({ type: 'complete', status: dbDeployment.status, error: dbDeployment.error_message })}\n\n`);
          res.end();
        } else {
          res.write(`data: ${JSON.stringify({ type: 'error', message: 'Deployment not found' })}\n\n`);
          res.end();
        }
      })
      .catch((err: any) => {
        res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
        res.end();
      });
  }
});

router.get("/api/deploy/history", async (req: Request, res: Response) => {
  try {
    const { organizationId, limit = 20, offset = 0 } = req.query;
    
    let query;
    if (organizationId) {
      query = sql`
        SELECT * FROM deployments 
        WHERE organization_id = ${Number(organizationId)}
        ORDER BY created_at DESC 
        LIMIT ${Number(limit)} OFFSET ${Number(offset)}
      `;
    } else {
      query = sql`
        SELECT * FROM deployments 
        ORDER BY created_at DESC 
        LIMIT ${Number(limit)} OFFSET ${Number(offset)}
      `;
    }
    
    const result = await db.execute(query);
    const rows = (result as any).rows || result;
    
    const deployments = rows.map((row: any) => ({
      id: row.id,
      jobId: row.job_id,
      organizationId: row.organization_id,
      projectId: row.project_id,
      serverHost: row.server_host,
      serverUser: row.server_user,
      serverPort: row.server_port,
      remotePath: row.remote_path,
      localBuildPath: row.local_build_path,
      status: row.status,
      errorMessage: row.error_message,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      createdAt: row.created_at
    }));
    
    res.json({ deployments });
    
  } catch (error: any) {
    console.error("Error fetching deployment history:", error);
    res.status(500).json({ error: error.message });
  }
});

router.get("/api/deploy/job/:jobId", async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    
    const result = await db.execute(sql`SELECT * FROM deployments WHERE job_id = ${jobId}`);
    const rows = (result as any).rows || result;
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Deployment not found" });
    }
    
    const row = rows[0];
    res.json({
      id: row.id,
      jobId: row.job_id,
      organizationId: row.organization_id,
      projectId: row.project_id,
      serverHost: row.server_host,
      serverUser: row.server_user,
      serverPort: row.server_port,
      remotePath: row.remote_path,
      localBuildPath: row.local_build_path,
      status: row.status,
      logs: row.logs,
      errorMessage: row.error_message,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      createdAt: row.created_at
    });
    
  } catch (error: any) {
    console.error("Error fetching deployment:", error);
    res.status(500).json({ error: error.message });
  }
});

router.delete("/api/deploy/job/:jobId", async (req: Request, res: Response) => {
  try {
    if (!verifyDeployToken(req)) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const { jobId } = req.params;
    
    await db.execute(sql`DELETE FROM deployments WHERE job_id = ${jobId}`);
    
    res.json({ success: true, message: "Deployment record deleted" });
    
  } catch (error: any) {
    console.error("Error deleting deployment:", error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
