// index.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { ethers } from 'ethers';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { sdk } from '@farcaster/miniapp-sdk';

// ───────────────────────────────────────────────────────────────────────────────
// Firebase config (replace with real values)
// ───────────────────────────────────────────────────────────────────────────────
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

// ───────────────────────────────────────────────────────────────────────────────
// Contract
// ───────────────────────────────────────────────────────────────────────────────
const CONTRACT_ADDRESS = "0x4625289Eaa6c73151106c69Ee65EF7146b95C8f7";
const CONTRACT_ABI = [
  "event GachaPulled(address indexed user, uint256 indexed tokenId, uint256 rarity)",
  "function pullGacha()",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function name() view returns (string)",
  "function symbol() view returns (string)"
];

const rarityMap = [
  'Common', 'Uncommon', 'Bronze', 'Silver', 'Gold',
  'Platinum', 'Rare', 'Epic', 'Legendary', 'Mythic'
];

// ───────────────────────────────────────────────────────────────────────────────
// App Component
// ───────────────────────────────────────────────────────────────────────────────
function App() {
  const [currentAccount, setCurrentAccount] = useState(null);
  const [currentTab, setCurrentTab] = useState('gacha');
  const [myCards, setMyCards] = useState([]);
  const [isPulling, setIsPulling] = useState(false);
  const [pullResult, setPullResult] = useState(null);

  // Connect (request) accounts on button click
  const connectWallet = useCallback(async () => {
    const provider = sdk.getEthereumProvider();
    if (!provider) return alert("No Farcaster wallet found. Please open in a Farcaster Mini App host.");
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' });
      if (accounts.length) setCurrentAccount(accounts[0]);
    } catch (e) {
      console.warn('User rejected or error requesting accounts', e);
    }
  }, []);

  // On load, check existing accounts (silent)
  useEffect(() => {
    (async () => {
      try {
        const provider = sdk.getEthereumProvider();
        if (!provider) return;
        const accounts = await provider.request({ method: 'eth_accounts' });
        if (accounts?.length) setCurrentAccount(accounts[0]);

        // listen for account changes
        provider?.on?.('accountsChanged', (accs) => {
          setCurrentAccount(accs?.[0] || null);
        });
      } catch (e) {
        console.warn('Error fetching accounts', e);
      }
    })();
  }, []);

  // Event listener (subscribe/unsubscribe)
  const setupEventListener = useCallback(() => {
    const provider = sdk.getEthereumProvider();
    if (!provider) return;

    const web3Provider = new ethers.providers.Web3Provider(provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, web3Provider);

    const handler = async (user, tokenId, rarity) => {
      if (!currentAccount) return;
      if (user.toLowerCase() !== currentAccount.toLowerCase()) return;

      const cardData = {
        user,
        tokenId: tokenId.toString(),
        rarity: rarityMap[Number(rarity)] ?? String(rarity),
        pulledAt: new Date()
      };

      console.log(`GachaPulled: tokenId=${cardData.tokenId}, rarity=${cardData.rarity}`);
      setPullResult(cardData);
      setIsPulling(false);

      try {
        await addDoc(collection(db, "cards"), cardData);
      } catch (e) {
        console.error("Error adding document: ", e);
      }
    };

    contract.on("GachaPulled", handler);
    return () => {
      try { contract.off("GachaPulled", handler); } catch {}
    };
  }, [currentAccount]);

  useEffect(() => {
    const cleanup = setupEventListener();
    return cleanup;
  }, [setupEventListener]);

  // Fetch my cards when account/tab changes
  const fetchMyCards = useCallback(async () => {
    if (!currentAccount) return;
    const q = query(collection(db, "cards"), where("user", "==", currentAccount));
    const querySnapshot = await getDocs(q);
    const cards = [];
    querySnapshot.forEach((doc) => cards.push(doc.data()));
    setMyCards(cards);
  }, [currentAccount]);

  useEffect(() => {
    if (currentAccount) fetchMyCards();
    else setMyCards([]);
  }, [currentAccount, currentTab, fetchMyCards]);

  // Pull gacha
  const pullGacha = useCallback(async () => {
    try {
      const provider = sdk.getEthereumProvider();
      if (!provider) {
        alert("Please connect your Farcaster wallet!");
        return;
      }
      const web3Provider = new ethers.providers.Web3Provider(provider);
      const signer = web3Provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

      const network = await web3Provider.getNetwork();
      if (Number(network.chainId) !== 84532) {
        alert("Please switch your Farcaster wallet to the Base Sepolia Testnet (chainId 84532).");
        return;
      }

      setIsPulling(true);
      setPullResult(null);
      console.log("Pulling Gacha...");
      const tx = await contract.pullGacha();
      await tx.wait();
      console.log("Gacha pull successful!");
    } catch (error) {
      console.error("Error during Gacha pull:", error);
      setIsPulling(false);
    }
  }, []);

  // UI
  const renderGachaTab = () => (
    <div className="tab-content gacha-tab">
      <div className="gacha-machine">
        <div className="display-screen">
          {pullResult ? (
            <div className={`card ${pullResult.rarity.toLowerCase()}`}>
              <h3>{pullResult.rarity} Card</h3>
              <p>Token ID: {pullResult.tokenId}</p>
            </div>
          ) : (
            <p className="placeholder-text">Press the button to pull your free NFT!</p>
          )}
        </div>
        <button onClick={pullGacha} disabled={!currentAccount || isPulling} className="pull-button">
          {isPulling ? "Pulling..." : "Pull Gacha (Free)"}
        </button>
      </div>
    </div>
  );

  const renderMyCardsTab = () => (
    <div className="tab-content cards-tab">
      {myCards.length > 0 ? (
        <div className="card-grid">
          {myCards.map((card, index) => (
            <div key={index} className={`card ${card.rarity.toLowerCase()}`}>
              <h3>{card.rarity} Card</h3>
              <p>Token ID: {card.tokenId}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="placeholder-text">You haven't pulled any cards yet.</p>
      )}
    </div>
  );

  return (
    <div className="app-container">
      <header className="header">
        <h1>Mystery Gacha NFT Machine</h1>
        <div className="wallet-info">
          {currentAccount ? (
            <span className="wallet-address">
              Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}
            </span>
          ) : (
            <button onClick={connectWallet} className="connect-button">Connect Farcaster Wallet</button>
          )}
        </div>
      </header>

      <div className="tab-selector">
        <button
          className={currentTab === 'gacha' ? 'active' : ''}
          onClick={() => setCurrentTab('gacha')}
        >
          Gacha Vending Machine
        </button>
        <button
          className={currentTab === 'cards' ? 'active' : ''}
          onClick={() => setCurrentTab('cards')}
        >
          My Cards
        </button>
      </div>

      {currentTab === 'gacha' ? renderGachaTab() : renderMyCardsTab()}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Boot + hardened ready()
// ───────────────────────────────────────────────────────────────────────────────

// wait for two RAFs to ensure the first frame actually committed
function afterFirstPaint() {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

async function callReadyOnce(opts) {
  if (window.__miniappReadyCalled) return;
  try {
    await sdk.actions.ready(opts);
    window.__miniappReadyCalled = true;
    console.log('[miniapp] sdk.actions.ready() → OK');
  } catch (e) {
    console.warn('[miniapp] ready() threw (host missing or other issue):', e);
  }
}

// Guard against duplicates in Strict Mode / HMR
window.__miniappReadyCalled = window.__miniappReadyCalled || false;

(async function boot() {
  // Ensure #root exists
  const container = document.getElementById('root');
  if (!container) {
    console.error('[miniapp] #root not found in DOM');
    return;
  }

  // Render first so the host can safely dismiss the splash
  const root = createRoot(container);
  root.render(<App />);

  // Call ready() after first paint
  try {
    await afterFirstPaint();
    await callReadyOnce(); // pass { disableNativeGestures: true } if needed
  } catch (e) {
    console.warn('[miniapp] post-paint ready() failed:', e);
  }

  // Safety net in case the first call was skipped/blocked
  setTimeout(() => callReadyOnce(), 1200);
})();
