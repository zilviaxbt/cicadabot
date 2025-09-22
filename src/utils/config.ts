import dotenv from 'dotenv';
import path from 'path';
import { BotConfig } from '../types';

// Load environment variables from the project root
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export function loadConfig(): BotConfig {
  const privateKey = process.env['PRIVATE_KEY'];
  const walletAddress = process.env['WALLET_ADDRESS'];


  if (!privateKey) {
    throw new Error('PRIVATE_KEY environment variable is required');
  }

  if (!walletAddress) {
    throw new Error('WALLET_ADDRESS environment variable is required');
  }

  return {
    privateKey,
    walletAddress,
    gatewayBaseUrl: process.env['GATEWAY_BASE_URL'] || undefined,
    transactionWaitTimeoutMs: process.env['TRANSACTION_WAIT_TIMEOUT_MS'] 
      ? parseInt(process.env['TRANSACTION_WAIT_TIMEOUT_MS'], 10) 
      : 300000,
    logLevel: (process.env['LOG_LEVEL'] as 'error' | 'warn' | 'info' | 'debug') || 'info'
  };
}

export function validateConfig(config: BotConfig): void {
  if (!config.privateKey) {
    throw new Error('Private key is required');
  }

  // Remove 0x prefix if present and check length
  const cleanPrivateKey = config.privateKey.startsWith('0x') 
    ? config.privateKey.slice(2) 
    : config.privateKey;
    
  if (cleanPrivateKey.length !== 64) {
    throw new Error(`Invalid private key format. Expected 64 characters, got ${cleanPrivateKey.length}. Make sure to remove the 0x prefix if present.`);
  }

  if (!config.walletAddress || !config.walletAddress.startsWith('eth|')) {
    throw new Error('Invalid wallet address format. Must start with "eth|"');
  }

  if (config.transactionWaitTimeoutMs && config.transactionWaitTimeoutMs < 10000) {
    throw new Error('Transaction timeout must be at least 10 seconds');
  }
}
