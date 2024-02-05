import * as fs from 'fs';
import * as solanaWeb3 from '@solana/web3.js';

// Cüzdan oluşturma ve yönetme işlemleri için bir sınıf
class SolanaWalletManager {
  wallet: solanaWeb3.Keypair;

  constructor() {
    // Eğer daha önce oluşturulmuş bir cüzdan varsa onu yükle, yoksa yeni bir tane oluştur
    const existingWallet = this.loadWallet();
    this.wallet = existingWallet || solanaWeb3.Keypair.generate();
    this.saveWallet(); // Cüzdan oluşturulduğunda hemen kaydet
  }

  // Cüzdanı kaydet
  saveWallet() {
    const walletJson = {
      publicKey: this.wallet.publicKey.toString(),
      privateKey: this.wallet.secretKey.toString(),
      balance: this.getBalance(),
    };
    fs.writeFileSync('wallet.json', JSON.stringify(walletJson, null, 2));
  }

  // Daha önce oluşturulmuş cüzdanı yükle
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

  // Airdrop yap
  async airdrop(amount: number = 1) {
    const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'), 'confirmed');
    const publicKey = this.wallet.publicKey;

    try {
      const airdropSignature = await connection.requestAirdrop(publicKey, solanaWeb3.LAMPORTS_PER_SOL * amount);
      await connection.confirmTransaction(airdropSignature);
      console.log(`${amount} SOL airdrop yapıldı.`);
      this.saveWallet(); // Airdrop sonrasında bakiye değişebilir, bu yüzden cüzdanı tekrar kaydet
    } catch (error) {
      console.error('Airdrop başarısız:', error);
    }
  }

  // Bakiyeyi kontrol et
  async getBalance() {
    const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('devnet'), 'confirmed');
    const publicKey = this.wallet.publicKey;

    try {
      const balance = await connection.getBalance(publicKey);
      return balance / solanaWeb3.LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Bakiye alınamadı:', error);
      return 0;
    }
  }

  // Transfer yap
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
      console.log(`Transfer başarılı! İmza: ${signature}`);
      this.saveWallet(); // Transfer sonrasında bakiye değişebilir, bu yüzden cüzdanı tekrar kaydet
    } catch (error) {
      console.error('Transfer başarısız:', error);
    }
  }
}

// Kullanıcıdan alınan komutu işleyen fonksiyon
async function handleCommand(command: string, amount?: number, recipient?: string) {
  const walletManager = new SolanaWalletManager();

  switch (command) {
    case 'airdrop':
      await walletManager.airdrop(amount);
      break;
    case 'balance':
      const balance = await walletManager.getBalance();
      console.log(`Bakiye: ${balance} SOL`);
      break;
    case 'transfer':
      if (!recipient || !amount) {
        console.error('Geçersiz transfer komutu. Örnek: transfer [otherPublicKey] [Amount]');
        return;
      }
      await walletManager.transfer(recipient, amount);
      break;
    default:
      console.error('Geçersiz komut.');
  }
}

// Kullanıcıdan komutları al
const [command, recipient, amount] = process.argv.slice(2);
handleCommand(command, parseFloat(amount), recipient);
