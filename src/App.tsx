import './App.css';
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  clusterApiUrl,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { useEffect, useState } from "react";
import './App.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// import to fix polyfill issue with buffer with webpack
import * as buffer from "buffer";
import React from 'react';
window.Buffer = buffer.Buffer;

type DisplayEncoding = "utf8" | "hex";
type PhantomEvent = "disconnect" | "connect" | "accountChanged";
type PhantomRequestMethod =
  | "connect"
  | "disconnect"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (
    message: Uint8Array | string,
    display?: DisplayEncoding
  ) => Promise<any>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>;
}

const getProvider = (): PhantomProvider | undefined => {
  if ("solana" in window) {
    // @ts-ignore
    const provider = window.solana as any;
    if (provider.isPhantom) return provider as PhantomProvider;
  }
};

export default function App() {
  const [provider, setProvider] = useState<PhantomProvider | undefined>(undefined);
  const [receiverPublicKey, setReceiverPublicKey] = useState<PublicKey | undefined>(undefined);
  const [senderKeypair, setSenderKeypair] = useState<Keypair | undefined>(undefined);
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  useEffect(() => {
    const provider = getProvider();
    if (provider) setProvider(provider);
    else setProvider(undefined);
  }, []);

  const createSender = async () => {
    try {
      const loadingToast = toast.loading("Creating new account and airdropping SOL...");
      
      // Create a new keypair for the sender
      const newSenderKeypair = Keypair.generate();
      console.log('Sender account: ', newSenderKeypair.publicKey.toString());
      
      // Save the keypair in state
      setSenderKeypair(newSenderKeypair);

      console.log('Airdropping 2 SOL to Sender Wallet');
      
      // Request airdrop of 2 SOL
      const fromAirDropSignature = await connection.requestAirdrop(
        newSenderKeypair.publicKey,
        2 * LAMPORTS_PER_SOL
      );

      // Get latest block hash
      const latestBlockHash = await connection.getLatestBlockhash();

      // Confirm transaction
      await connection.confirmTransaction({
        blockhash: latestBlockHash.blockhash,
        lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
        signature: fromAirDropSignature
      });

      const walletBalance = await connection.getBalance(newSenderKeypair.publicKey);
      console.log('Wallet Balance: ' + walletBalance / LAMPORTS_PER_SOL);
      
      toast.update(loadingToast, {
        render: "Successfully created account and airdropped 2 SOL!",
        type: "success",
        isLoading: false,
        autoClose: 5000,
      });
    } catch (error) {
      toast.error("Failed to create account and airdrop SOL. Please try again.");
      console.error(error);
    }
  }

  const connectWallet = async () => {
    try {
      // @ts-ignore
      const { solana } = window;

      if (solana) {
        const loadingToast = toast.loading("Connecting to Phantom wallet...");
        // Connect to phantom wallet
        const response = await solana.connect();
        console.log('Wallet connected with public key:', response.publicKey.toString());
        // Save public key
        setReceiverPublicKey(response.publicKey);
        
        toast.update(loadingToast, {
          render: "Successfully connected to Phantom wallet!",
          type: "success",
          isLoading: false,
          autoClose: 5000,
        });
      }
    } catch (err) {
      toast.error("Failed to connect to Phantom wallet. Please try again.");
      console.error(err);
    }
  };

  const disconnectWallet = async () => {
    try {
      // @ts-ignore
      const { solana } = window;

      if (solana) {
        const loadingToast = toast.loading("Disconnecting from Phantom wallet...");
        await solana.disconnect();
        setReceiverPublicKey(undefined);
        
        toast.update(loadingToast, {
          render: "Successfully disconnected from Phantom wallet!",
          type: "success",
          isLoading: false,
          autoClose: 5000,
        });
      }
    } catch (err) {
      toast.error("Failed to disconnect from Phantom wallet. Please try again.");
      console.error(err);
    }
  };

  const transferSol = async () => {    
    if (!senderKeypair || !receiverPublicKey) {
      toast.error("Please create a sender account and connect a receiver wallet first");
      return;
    }

    try {
      const loadingToast = toast.loading("Transferring 1 SOL...");

      // Create transaction object
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: senderKeypair.publicKey,
          toPubkey: receiverPublicKey,
          lamports: LAMPORTS_PER_SOL // Transfer 1 SOL
        })
      );

      // Send and confirm transaction
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [senderKeypair] // Signer array
      );

      console.log("Transaction sent and confirmed. Signature:", signature);
      
      // Log final balances
      const senderBalance = await connection.getBalance(senderKeypair.publicKey);
      const receiverBalance = await connection.getBalance(receiverPublicKey);
      
      console.log("Sender Balance: " + senderBalance / LAMPORTS_PER_SOL);
      console.log("Receiver Balance: " + receiverBalance / LAMPORTS_PER_SOL);

      toast.update(loadingToast, {
        render: "Successfully transferred 1 SOL!",
        type: "success",
        isLoading: false,
        autoClose: 5000,
      });
    } catch (error) {
      toast.error("Failed to transfer SOL. Please try again.");
      console.error(error);
    }
  };

  return (
    <div className="App">
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      
      <header className="App-header">
        <h2>Module 2 Assessment</h2>
        <span className="buttons">
          <button
            style={{
              fontSize: "16px",
              padding: "15px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={createSender}
          >
            Create a New Solana Account
          </button>
          {provider && !receiverPublicKey && (
            <button
              style={{
                fontSize: "16px",
                padding: "15px",
                fontWeight: "bold",
                borderRadius: "5px",
              }}
              onClick={connectWallet}
            >
              Connect to Phantom Wallet
            </button>
          )}
          {provider && receiverPublicKey && (
            <div>
              <button
                style={{
                  fontSize: "16px",
                  padding: "15px",
                  fontWeight: "bold",
                  borderRadius: "5px",
                  position: "absolute",
                  top: "28px",
                  right: "28px"
                }}
                onClick={disconnectWallet}
              >
                Disconnect from Wallet
              </button>
            </div>
          )}
          {provider && receiverPublicKey && senderKeypair && (
            <button
              style={{
                fontSize: "16px",
                padding: "15px",
                fontWeight: "bold",
                borderRadius: "5px",
              }}
              onClick={transferSol}
            >
              Transfer SOL to Phantom Wallet
            </button>
          )}
        </span>
        {!provider && (
          <p>
            No provider found. Install{" "}
            <a href="https://phantom.app/">Phantom Browser extension</a>
          </p>
        )}
      </header>
    </div>
  );
}