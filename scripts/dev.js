#!/usr/bin/env node

import { spawn, execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const PREFERRED_CLIENT_PORT = 3000;
const PREFERRED_API_PORT = 3001;

function isPortInUse(port) {
  try {
    const result = execSync(`lsof -ti :${port}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    return result.length > 0;
  } catch {
    return false;
  }
}

function getAllProcessesOnPort(port) {
  const processes = [];
  try {
    const result = execSync(`lsof -ti :${port}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    if (result) {
      for (const pid of result.split('\n')) {
        try {
          const command = execSync(`ps -p ${pid} -o command=`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
          processes.push({ pid, command });
        } catch { /* Process may have exited */ }
      }
    }
  } catch { /* No processes found */ }
  return processes;
}

function isOurProcess(command) {
  return command.includes('vite') ||
         command.includes('tsx') ||
         command.includes('grand-theft-swarm') ||
         command.includes('GTS') ||
         command.includes('node_modules/.bin');
}

function killProcess(pid, signal = 15) {
  try {
    execSync(`kill -${signal} ${pid}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function waitForPortFree(port, maxWait = 5000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    if (!isPortInUse(port)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return false;
}

function findAvailablePort(preferred, exclude = []) {
  let port = preferred;
  while (isPortInUse(port) || exclude.includes(port)) {
    port++;
    if (port > preferred + 100) {
      throw new Error(`Could not find available port near ${preferred}`);
    }
  }
  return port;
}

async function preparePorts() {
  let clientPort = PREFERRED_CLIENT_PORT;
  let apiPort = PREFERRED_API_PORT;

  const ourPidsToKill = new Set();
  const externalBlockedPorts = [];

  // Check both preferred ports
  for (const { port, name } of [
    { port: PREFERRED_CLIENT_PORT, name: 'client' },
    { port: PREFERRED_API_PORT, name: 'api' }
  ]) {
    if (isPortInUse(port)) {
      const processes = getAllProcessesOnPort(port);
      const ourProcesses = processes.filter(p => isOurProcess(p.command));
      const externalProcesses = processes.filter(p => !isOurProcess(p.command));

      if (ourProcesses.length > 0) {
        console.log(`[dev] Port ${port} (${name}) in use by GTS, restarting...`);
        ourProcesses.forEach(p => ourPidsToKill.add(p.pid));
      } else if (externalProcesses.length > 0) {
        console.log(`[dev] Port ${port} (${name}) in use by external app`);
        externalBlockedPorts.push(port);
      }
    }
  }

  // Kill our own processes and wait for them to die
  if (ourPidsToKill.size > 0) {
    console.log(`[dev] Stopping ${ourPidsToKill.size} existing process(es)...`);

    // SIGTERM first
    for (const pid of ourPidsToKill) {
      killProcess(pid, 15);
    }

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 500));

    // SIGKILL any remaining
    for (const pid of ourPidsToKill) {
      killProcess(pid, 9);
    }

    // Wait for ports to be released
    console.log(`[dev] Waiting for ports to be released...`);
    const [clientFree, apiFree] = await Promise.all([
      waitForPortFree(PREFERRED_CLIENT_PORT, 5000),
      waitForPortFree(PREFERRED_API_PORT, 5000)
    ]);

    if (!clientFree || !apiFree) {
      console.log(`[dev] Some ports still in use, finding alternatives...`);
    }
  }

  // Determine final ports
  if (externalBlockedPorts.includes(PREFERRED_CLIENT_PORT) || isPortInUse(PREFERRED_CLIENT_PORT)) {
    clientPort = findAvailablePort(PREFERRED_CLIENT_PORT + 2, [PREFERRED_API_PORT]);
    console.log(`[dev] Using alternate client port: ${clientPort}`);
  }

  if (externalBlockedPorts.includes(PREFERRED_API_PORT) || isPortInUse(PREFERRED_API_PORT)) {
    apiPort = findAvailablePort(PREFERRED_API_PORT + 2, [clientPort]);
    console.log(`[dev] Using alternate API port: ${apiPort}`);
  }

  return { clientPort, apiPort };
}

async function main() {
  const ports = await preparePorts();

  console.log('');
  console.log(`[dev] Starting dev servers...`);
  console.log(`[dev]   Client: http://localhost:${ports.clientPort}`);
  console.log(`[dev]   API:    http://localhost:${ports.apiPort}`);
  console.log(`[dev]   Config Editor API: http://localhost:${ports.apiPort}/api/dev/config`);
  console.log('');

  // Set up environment for child processes
  const env = {
    ...process.env,
    NODE_ENV: 'development',
    VITE_API_URL: `http://localhost:${ports.apiPort}`,
    PORT: String(ports.apiPort),
    CLIENT_URL: `http://localhost:${ports.clientPort}`,
  };

  // Start client
  const client = spawn(`npx pnpm --filter client dev --port ${ports.clientPort}`, {
    cwd: rootDir,
    env,
    stdio: 'inherit',
    shell: true,
  });

  // Start API
  const api = spawn('npx pnpm --filter api dev', {
    cwd: rootDir,
    env,
    stdio: 'inherit',
    shell: true,
  });

  // Handle cleanup
  function cleanup() {
    console.log('\n[dev] Shutting down...');
    client.kill('SIGTERM');
    api.kill('SIGTERM');
    setTimeout(() => process.exit(0), 1000);
  }

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // Handle child process exits
  let exitCount = 0;
  const handleExit = (name) => (code) => {
    if (code !== 0 && code !== null) {
      console.error(`[dev] ${name} exited with code ${code}`);
    }
    exitCount++;
    if (exitCount === 2) {
      process.exit(0);
    }
  };

  client.on('exit', handleExit('Client'));
  api.on('exit', handleExit('API'));
}

main().catch((err) => {
  console.error('[dev] Error:', err.message);
  process.exit(1);
});
