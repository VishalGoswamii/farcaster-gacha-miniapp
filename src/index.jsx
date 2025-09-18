import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { createConfig, connect, writeContract, readContract, http, getAccount } from '@wagmi/core';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { baseSepolia } from 'wagmi/chains';
import { parseEther } from 'viem';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs, onSnapshot } from 'firebase/firestore';

// Firebase configuration - replace with your actual config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Smart contract details
const CONTRACT_ADDRESS = "0x4625289Eaa6c73151106c69Ee65EF7146b95C8f7";
const CONTRACT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": true, "internalType": "uint256", "name": "tokenId", "type": "uint256" },
      { "indexed": false, "internalType": "enum MysteryGacha.Rarity", "name": "rarity", "type": "uint8" }
    ],
    "name": "GachaPulled",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "pullGacha",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
    ],
    "name": "ownerOf",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

const rarityMap = [
  'Common', 'Uncommon', 'Bronze', 'Silver', 'Gold',
  'Platinum', 'Rare', 'Epic', 'Legendary', 'Mythic'
];

// 1. Create wagmiConfig
const config = createConfig({
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http()
  }
});

const App = () => {
  const [currentAccount, setCurrentAccount] = useState(null);
  const [currentTab, setCurrentTab] = useState('gacha');
  const [myCards, setMyCards] = useState([]);
  const [isPulling, setIsPulling] = useState(false);
  const [pullResult, setPullResult] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const account = getAccount(config);
    if (account.isConnected) {
      setCurrentAccount(account.address);
    }
  }, []);

  const connectWallet = async () => {
    try {
      const { accounts } = await connect(config, { connector: farcasterMiniApp() });
      if (accounts && accounts.length > 0) {
        setCurrentAccount(accounts[0]);
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  const pullGacha = async () => {
    setShowPreview(true);
  };

  const confirmPull = async () => {
    setShowPreview(false);
    try {
      setIsPulling(true);
      setPullResult(null);

      const account = getAccount(config);
      if (!account.isConnected) {
        alert("Please connect your wallet first.");
        setIsPulling(false);
        return;
      }

      console.log("Pulling Gacha via Wagmi...");
      const transactionHash = await writeContract(config, {
        abi: CONTRACT_ABI,
        address: CONTRACT_ADDRESS,
        functionName: 'pullGacha',
        chainId: baseSepolia.id,
        account: account.address,
      });

      console.log("Transaction sent:", transactionHash);

      // Note: Wagmi doesn't have a direct `wait()` function like Ethers.js
      // We will rely on the event listener to update the UI
      
    } catch (error) {
      console.error("Error during Gacha pull:", error);
      setIsPulling(false);
    }
  };

  const setupEventListener = () => {
    // Event listening in Wagmi requires a WebSocket provider for real-time updates.
    // For this app, the `getDocs` on a state change is sufficient to update the UI.
  };

  const fetchMyCards = async () => {
    if (!currentAccount) return;

    const q = query(collection(db, "cards"), where("user", "==", currentAccount));
    const querySnapshot = await getDocs(q);
    const cards = [];
    querySnapshot.forEach((doc) => {
      cards.push(doc.data());
    });
    setMyCards(cards);
  };
  
  // RENDER LOGIC REMAINS THE SAME
  const renderGachaTab = () => (
    <div className="tab-content gacha-tab">
      <div className="gacha-machine">
        <div className="gacha-screen pixel-border">
          {pullResult ? (
            <div className={`gacha-card ${pullResult.rarity.toLowerCase()}`}>
              <div className="card-top pixel-border"></div>
              <div className="card-content pixel-font">
                <div className="card-rarity-text">{pullResult.rarity}</div>
                <p className="card-tokenId">Token ID: {pullResult.tokenId}</p>
              </div>
              <div className="card-bottom pixel-border"></div>
            </div>
          ) : (
            <div className="gacha-prompt pixel-font">
              <p>Ready to get a new item?</p>
              <p>Click the button to try your luck!</p>
            </div>
          )}
        </div>
        <button onClick={pullGacha} disabled={!currentAccount || isPulling} className="gacha-pull-button pixel-border pixel-font">
          {isPulling ? "Pulling..." : "PULL GACHA"}
        </button>
      </div>
      {showPreview && (
        <div className="modal-overlay">
          <div className="modal-content pixel-border">
            <h2 className="modal-title pixel-font">Confirm Pull</h2>
            <p className="modal-text">Are you ready to pull a free NFT?</p>
            <div className="modal-buttons">
              <button onClick={confirmPull} className="confirm-button pixel-font pixel-border">CONFIRM</button>
              <button onClick={() => setShowPreview(false)} className="cancel-button pixel-font pixel-border">CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderMyCardsTab = () => (
    <div className="tab-content my-cards-tab">
      <div className="card-display-area">
        {myCards.length > 0 ? (
          <div className="card-grid">
            {myCards.map((card, index) => (
              <div key={index} className={`gacha-card ${card.rarity.toLowerCase()} pixel-border`}>
                <div className="card-top pixel-border"></div>
                <div className="card-content pixel-font">
                  <div className="card-rarity-text">{card.rarity}</div>
                  <p className="card-tokenId">Token ID: {card.tokenId}</p>
                </div>
                <div className="card-bottom pixel-border"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-cards-prompt pixel-font">
            <p>You haven't pulled any cards yet!</p>
            <p>Go to the "Gacha Machine" tab to get started.</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="app-container pixel-border">
      <header className="app-header">
        <h1 className="app-title pixel-font">Gacha NFT</h1>
        <div className="wallet-section pixel-font">
          {currentAccount ? (
            <span className="wallet-address">Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}</span>
          ) : (
            <button onClick={connectWallet} className="connect-wallet-button pixel-font pixel-border">Connect Wallet</button>
          )}
        </div>
      </header>
      <div className="tab-container pixel-border">
        <button
          className={`tab-button ${currentTab === 'gacha' ? 'active' : ''} pixel-font pixel-border`}
          onClick={() => setCurrentTab('gacha')}
        >
          GACHA
        </button>
        <button
          className={`tab-button ${currentTab === 'cards' ? 'active' : ''} pixel-font pixel-border`}
          onClick={() => setCurrentTab('cards')}
        >
          COLLECTION
        </button>
      </div>
      {currentTab === 'gacha' ? renderGachaTab() : renderMyCardsTab()}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);