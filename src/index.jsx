import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { ethers } from 'ethers';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs, onSnapshot } from 'firebase/firestore';

// Import Farcaster Mini App SDK
import { sdk } from '@farcaster/miniapp-sdk';

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

const App = () => {
  const [currentAccount, setCurrentAccount] = useState(null);
  const [currentTab, setCurrentTab] = useState('gacha');
  const [myCards, setMyCards] = useState([]);
  const [isPulling, setIsPulling] = useState(false);
  const [pullResult, setPullResult] = useState(null);
  const [isFarcasterReady, setIsFarcasterReady] = useState(false);

  useEffect(() => {
    // Signal to the Farcaster client that the app is ready to be displayed
    const initFarcaster = async () => {
      try {
        await miniapp.actions.ready();
        setIsFarcasterReady(true);
        console.log("Farcaster Mini App is ready.");
      } catch (e) {
        console.error("Farcaster SDK not found. Running in regular browser mode.", e);
        setIsFarcasterReady(false);
      }
    };
    initFarcaster();

    if (isFarcasterReady) {
      getFarcasterWallet();
      setupEventListener();
    }
  }, [isFarcasterReady]);

  useEffect(() => {
    if (currentAccount) {
      fetchMyCards();
    } else {
      setMyCards([]);
    }
  }, [currentAccount, currentTab]);

  const getFarcasterWallet = async () => {
    try {
      const provider = miniapp.getEthereumProvider();
      if (!provider) {
        console.log("No Farcaster provider found.");
        return;
      }
      const accounts = await provider.request({ method: 'eth_accounts' });
      if (accounts.length !== 0) {
        const account = accounts[0];
        setCurrentAccount(account);
        console.log("Farcaster wallet connected:", account);
      }
    } catch (error) {
      console.log("Error getting Farcaster wallet:", error);
    }
  };

  const pullGacha = async () => {
    try {
      const provider = miniapp.getEthereumProvider();
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

      console.log("Pulling Gacha on Base Sepolia...");
      const transaction = await contract.pullGacha();
      await transaction.wait();
      
      console.log("Gacha pull successful!");
      
    } catch (error) {
      console.error("Error during Gacha pull:", error);
      setIsPulling(false);
    }
  };
  
  const setupEventListener = () => {
    try {
      const provider = miniapp.getEthereumProvider();
      if (!provider) {
        return;
      }
      const web3Provider = new ethers.providers.Web3Provider(provider);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, web3Provider);

      contract.on("GachaPulled", async (user, tokenId, rarity) => {
        if (user.toLowerCase() === currentAccount.toLowerCase()) {
          console.log(`GachaPulled event received: tokenId=${tokenId}, rarity=${rarityMap[rarity]}`);
          const cardData = {
            user: user,
            tokenId: tokenId.toString(),
            rarity: rarityMap[rarity],
            pulledAt: new Date()
          };

          setPullResult(cardData);
          setIsPulling(false);

          // Add card to Firestore
          try {
            await addDoc(collection(db, "cards"), cardData);
          } catch (e) {
            console.error("Error adding document: ", e);
          }
        }
      });
    } catch (error) {
      console.log(error);
    }
  };

  const fetchMyCards = async () => {
    const q = query(collection(db, "cards"), where("user", "==", currentAccount));
    const querySnapshot = await getDocs(q);
    const cards = [];
    querySnapshot.forEach((doc) => {
      cards.push(doc.data());
    });
    setMyCards(cards);
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
            <button onClick={getFarcasterWallet} className="connect-button">Connect Farcaster Wallet</button>
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
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);