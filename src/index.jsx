// index.jsx
import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client'; // ✅ correct import for React 18
import { ethers } from 'ethers';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs } from 'firebase/firestore';

// Farcaster Mini App SDK
import { sdk } from '@farcaster/miniapp-sdk';

// --- Firebase config (replace with real values) ---
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

// --- Contract ---
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

function App() {
  const [currentAccount, setCurrentAccount] = useState(null);
  const [currentTab, setCurrentTab] = useState('gacha');
  const [myCards, setMyCards] = useState([]);
  const [isPulling, setIsPulling] = useState(false);
  const [pullResult, setPullResult] = useState(null);

  // --- Farcaster provider helpers ---
  const getFarcasterWallet = async () => {
    try {
      const provider = sdk.getEthereumProvider();
      if (!provider) {
        console.log("No Farcaster provider found.");
        return;
      }
      // If you want to actively request accounts on button click, use 'eth_requestAccounts'
      const accounts = await provider.request({ method: 'eth_accounts' });
      if (accounts.length) {
        setCurrentAccount(accounts[0]);
        console.log("Farcaster wallet connected:", accounts[0]);
      }
    } catch (error) {
      console.log("Error getting Farcaster wallet:", error);
    }
  };

  const setupEventListener = React.useCallback(() => {
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

  const fetchMyCards = React.useCallback(async () => {
    if (!currentAccount) return;
    const q = query(collection(db, "cards"), where("user", "==", currentAccount));
    const querySnapshot = await getDocs(q);
    const cards = [];
    querySnapshot.forEach((doc) => cards.push(doc.data()));
    setMyCards(cards);
  }, [currentAccount]);

  useEffect(() => {
    // listen for events while user is connected
    const cleanup = setupEventListener();
    return cleanup;
  }, [setupEventListener]);

  useEffect(() => {
    if (currentAccount) fetchMyCards();
    else setMyCards([]);
  }, [currentAccount, currentTab, fetchMyCards]);

  const pullGacha = async () => {
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
      if (network.chainId !== 84532) {
        alert("Please switch your Farcaster wallet to the Base Sepolia Testnet!");
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
  };

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
            <span className="wallet-address">Wallet: {currentAccount.slice(0, 6)}...{currentAccount.slice(-4)}</span>
          ) : (
            <button
              onClick={async () => {
                // actively request accounts on click
                const provider = sdk.getEthereumProvider();
                if (!provider) return alert("No Farcaster wallet found.");
                try {
                  const accounts = await provider.request({ method: 'eth_requestAccounts' });
                  if (accounts.length) setCurrentAccount(accounts[0]);
                } catch (e) {
                  console.warn('User rejected or error requesting accounts', e);
                }
              }}
              className="connect-button"
            >
              Connect Farcaster Wallet
            </button>
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

// ---------- Boot & call sdk.actions.ready() exactly once ----------
const ensureDomReady = () =>
  new Promise((resolve) => {
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', resolve, { once: true });
    } else {
      resolve();
    }
  });

// Guard against double-invocation in dev/StrictMode/HMR
window.__miniappReadyCalled = window.__miniappReadyCalled || false;

(async function boot() {
  await ensureDomReady();

  const container = document.getElementById('root');
  const root = createRoot(container);
  root.render(<App />); // render first so UI exists

  if (!window.__miniappReadyCalled) {
    try {
      await sdk.actions.ready(); // { disableNativeGestures: true } if needed
      window.__miniappReadyCalled = true;
      console.log('[miniapp] sdk.actions.ready() called');
    } catch (e) {
      // If not inside Farcaster host, this is expected.
      console.warn('[miniapp] ready() failed or host not detected:', e);
    }
  }
})();
