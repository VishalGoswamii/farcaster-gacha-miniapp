import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { ethers } from 'ethers';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs, onSnapshot } from 'firebase/firestore';
import { sdk } from '@farcaster/miniapp-sdk';

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
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const initFarcaster = async () => {
      try {
        await sdk.actions.ready();
        setIsFarcasterReady(true);
        console.log("Farcaster Mini App is ready.");
      } catch (e) {
        console.error("Farcaster SDK not found. Running in regular browser mode.", e);
        setIsFarcasterReady(false);
      }
    };
    initFarcaster();
  }, []);

  useEffect(() => {
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
      const provider = sdk.getEthereumProvider();
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
    setShowPreview(true);
  };
  
  const confirmPull = async () => {
    setShowPreview(false);
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
      const provider = sdk.getEthereumProvider();
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
            <button onClick={getFarcasterWallet} className="connect-wallet-button pixel-font pixel-border">Connect Wallet</button>
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