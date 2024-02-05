// wallet.ts

import * as fs from 'fs';
import * as solanaWeb3 from '@solana/web3.js';

// Solana wallet management class
class SolanaWalletManager {
  wallet: solanaWeb3.Keypair;

  constructor() {
    // Load existing wallet or generate a new one
    const existingWallet = this.loadWallet();
    this.wallet = existingWallet || solanaWeb3.Keypair.generate();
    this.saveWallet(); // Save the wallet immediately upon creation
  }

  // Save the wallet to a JSON file
  saveWallet() {
    const walletJson = {
      publicKey: this.wallet.publicKey.toString(),
      privateKey: this.wallet.secretKey.toString(),
      balance: this.getBalance(),
    };
    fs.writeFileSync('wallet.json', JSON.stringify(walletJson, null, 2));
  }

  // Load an existing wallet from a JSON file
  loadWallet() {
    try {
      const walletJson = JSON.parse(fs.readFileSync('wallet.json', 'utf-8'));
      const loadedWallet = solanaWeb3.Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(walletJson.privateKey))
      );
      return loadedWallet;
    } catch (error) {
      return null;
    }
  }

  // Request an airdrop of SOL to the wallet
  async airdrop(amount: number = 1) {
    const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'), 'confirmed');
    const publicKey = this.wallet.publicKey;

    try {
      const airdropSignature = await connection.requestAirdrop(publicKey, solanaWeb3.LAMPORTS_PER_SOL * amount);
      await connection.confirmTransaction(airdropSignature);
      console.log(`${amount} SOL airdrop successful.`);
      this.saveWallet(); // Save the wallet after airdrop as the balance might change
    } catch (error) {
      console.error('Airdrop failed:', error);
    }
  }

  // Get the balance of the wallet
  async getBalance() {
    const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'), 'confirmed');
    const publicKey = this.wallet.publicKey;

    try {
      const balance = await connection.getBalance(publicKey);
      return balance / solanaWeb3.LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Failed to retrieve balance:', error);
      return 0;
    }
  }

  // Transfer SOL to another public key
  async transfer(recipientPublicKey: string, amount: number) {
    const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'), 'confirmed');
    const recipient = new solanaWeb3.PublicKey(recipientPublicKey);
    const transaction = new solanaWeb3.Transaction().add(
      solanaWeb3.SystemProgram.transfer({
        fromPubkey: this.wallet.publicKey,
        toPubkey: recipient,
        lamports: solanaWeb3.LAMPORTS_PER_SOL * amount,
      })
    );

    try {
      const signature = await solanaWeb3.sendAndConfirmTransaction(connection, transaction, [this.wallet]);
      console.log(`Transfer successful! Signature: ${signature}`);
      this.saveWallet(); // Save the wallet after transfer as the balance might change
    } catch (error) {
      console.error('Transfer failed:', error);
    }
  }
}

// Handle user commands
async function handleCommand(command: string, amount?: number, recipient?: string) {
  const walletManager = new SolanaWalletManager();

  switch (command) {
    case 'airdrop':
      await walletManager.airdrop(amount);
      break;
    case 'balance':
      const balance = await walletManager.getBalance();
      console.log(`Balance: ${balance} SOL`);
      break;
    case 'transfer':
      if (!recipient || !amount) {
        console.error('Invalid transfer command. Example: transfer [otherPublicKey] [Amount]');
        return;
      }
      await walletManager.transfer(recipient, amount);
      break;
    default:
      console.error('Invalid command.');
  }
}

// Parse and handle user input
const [command, recipient, amount] = process.argv.slice(2);
handleCommand(command, parseFloat(amount), recipient);
