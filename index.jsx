import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, collection, query, addDoc, getDocs } from 'firebase/firestore';
import { ethers } from 'ethers';
import { createRoot } from 'react-dom/client';
import { FaGift, FaWallet, FaUserCircle } from 'react-icons/fa';
import { BiCard } from 'react-icons/bi';

// Farcaster Frame Meta Tags (for the main page)
// <meta property="fc:frame" content="vNext">
// <meta property="fc:frame:image" content="https://placehold.co/600x400/1a1a1a/FFFFFF?text=Mystery+Gacha+Frame">
// <meta property="fc:frame:button:1" content="Start Game">
// <meta property="fc:frame:post_url" content="https://your-vercel-domain.vercel.app/api/gacha">

// Firebase Global Variables
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE";
const CONTRACT_ABI = [
  "function pullGacha() public payable",
  "event GachaPulled(address indexed user, uint256 indexed rarityTokenId)"
];

const RARITY_MAP = {
  0: { name: "Common", class: "bg-gradient-to-br from-gray-400 to-gray-600" },
  1: { name: "Uncommon", class: "bg-gradient-to-br from-green-400 to-green-600" },
  2: { name: "Bronze", class: "bg-gradient-to-br from-amber-600 to-amber-900" },
  3: { name: "Silver", class: "bg-gradient-to-br from-slate-300 to-slate-500" },
  4: { name: "Gold", class: "bg-gradient-to-br from-yellow-400 to-yellow-600" },
  5: { name: "Platinum", class: "bg-gradient-to-br from-slate-200 to-slate-400" },
  6: { name: "Rare", class: "bg-gradient-to-br from-blue-400 to-blue-600" },
  7: { name: "Epic", class: "bg-gradient-to-br from-purple-500 to-purple-700" },
  8: { name: "Legendary", class: "bg-gradient-to-br from-red-500 to-red-700" },
  9: { name: "Mythic", class: "bg-gradient-to-br from-purple-500 via-pink-500 to-red-500" },
};

const GachaMachine = ({ auth, db, user, contract }) => {
  const [status, setStatus] = useState("Click the button to connect your wallet.");
  const [isPulling, setIsPulling] = useState(false);
  const [currentRarity, setCurrentRarity] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);

  useEffect(() => {
    if (!contract) return;
    const gachaPulledFilter = contract.filters.GachaPulled(user?.walletAddress);
    
    const onGachaPulled = (userAddress, rarityTokenId, event) => {
        if (userAddress.toLowerCase() === user.walletAddress.toLowerCase()) {
            const rarity = RARITY_MAP[Number(rarityTokenId)];
            setCurrentRarity(rarity);
            setStatus(`You got a ${rarity.name} card!`);
            setIsPulling(false);
            
            saveCardToDatabase({
                id: event.log.transactionHash,
                rarity: rarity.name,
                tokenId: Number(rarityTokenId),
                timestamp: Date.now()
            });
        }
    };
    
    contract.on(gachaPulledFilter, onGachaPulled);

    return () => {
        contract.off(gachaPulledFilter, onGachaPulled);
    };
  }, [contract, user]);
  
  const saveCardToDatabase = async (cardData) => {
    try {
      const userCardsRef = collection(db, "artifacts", appId, "users", user.uid, "cards");
      await addDoc(userCardsRef, cardData);
      console.log("Card saved to database!");
    } catch (e) {
      console.error("Error saving card: ", e);
    }
  };

  const connectWallet = async () => {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      setWalletConnected(true);
      setStatus("Wallet connected. Ready to pull!");
    } catch (error) {
      setStatus("Failed to connect wallet. Please try again.");
      console.error("Wallet connection error:", error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative w-full max-w-lg mx-auto p-4 bg-gray-200 rounded-3xl shadow-xl flex flex-col items-center">
        <div className="w-full h-16 bg-red-600 rounded-t-2xl flex items-center justify-center text-white text-xl font-bold uppercase">
          Mystery Gacha
        </div>
        <div className="w-full p-4 h-96 bg-gray-900 rounded-b-2xl shadow-inner flex flex-col items-center justify-center text-center relative">
          <div className="text-gray-400 h-10 flex items-center justify-center text-xs sm:text-base px-4">
            {status}
          </div>
          <div id="card-display" className="w-full h-full flex items-center justify-center p-4">
            {currentRarity ? (
              <div className={`w-48 h-64 rounded-xl shadow-lg transition-all duration-500 transform scale-105 ${currentRarity.class}`}>
                <div className="w-full h-full p-4 flex flex-col justify-between items-start text-white">
                  <span className="text-sm font-bold">{currentRarity.name}</span>
                  <div className="flex-grow flex items-center justify-center w-full text-5xl font-bold">
                    ?
                  </div>
                  <div className="text-xs">
                    This card's rarity is {currentRarity.name}.
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-48 h-64 rounded-xl shadow-lg transition-all duration-500 bg-gray-700 flex items-center justify-center text-4xl font-bold text-white">
                ?
              </div>
            )}
          </div>
        </div>
        <div className="w-full flex justify-between items-center my-4">
          <div className="text-sm font-bold p-2 bg-gray-700 text-yellow-300 rounded-md">
            COST: FREE
          </div>
          <div className="w-16 h-2 bg-gray-600 rounded-full shadow-inner"></div>
        </div>
        <button
          onClick={walletConnected ? handlePullGacha : connectWallet}
          disabled={isPulling}
          className="w-full h-16 rounded-full text-white font-bold text-lg uppercase flex items-center justify-center transform transition-all duration-300
          bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed">
          {walletConnected ? (isPulling ? "Pulling..." : "Pull Gacha") : "Connect Wallet"}
        </button>
      </div>
    </div>
  );
};

const MyCards = ({ db, user }) => {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db || !user?.uid) {
        setLoading(false);
        return;
    }
    const cardsRef = collection(db, "artifacts", appId, "users", user.uid, "cards");
    const q = query(cardsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedCards = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        setCards(fetchedCards);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching cards: ", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [db, user]);

  return (
    <div className="p-4 w-full h-full overflow-y-auto">
      <h2 className="text-2xl font-bold mb-4">My Cards</h2>
      {loading ? (
        <div className="flex justify-center items-center h-40">Loading...</div>
      ) : cards.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {cards.map((card) => (
            <div key={card.id} className={`w-full aspect-[1/1.4] rounded-xl shadow-lg ${RARITY_MAP[card.tokenId].class}`}>
              <div className="w-full h-full p-2 flex flex-col justify-between items-start text-white">
                <span className="text-sm font-bold">{RARITY_MAP[card.tokenId].name}</span>
                <div className="flex-grow flex items-center justify-center w-full text-2xl font-bold">
                  ?
                </div>
                <div className="text-xs">
                  ID: {card.id.substring(0, 5)}...
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-400 mt-10">You don't have any cards yet! Pull the gacha to start your collection.</div>
      )}
    </div>
  );
};

const App = () => {
    const [view, setView] = useState("gacha");
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [user, setUser] = useState(null);
    const [contract, setContract] = useState(null);
    const [loading, setLoading] = useState(true);
    const [fid, setFid] = useState('N/A');
    const [pfp, setPfp] = useState('https://placehold.co/100x100?text=PFP');

    useEffect(() => {
        if (!firebaseConfig.apiKey) {
            console.error("Firebase config is missing. Please check your environment variables.");
            setLoading(false);
            return;
        }

        const app = initializeApp(firebaseConfig);
        const firestore = getFirestore(app);
        const authInstance = getAuth(app);
        
        setDb(firestore);
        setAuth(authInstance);

        const unsubscribe = onAuthStateChanged(authInstance, async (authUser) => {
            if (authUser) {
                if (initialAuthToken) {
                    await signInWithCustomToken(authInstance, initialAuthToken);
                }
                const provider = new ethers.JsonRpcProvider("https://sepolia.base.org");
                const mysteryContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
                setContract(mysteryContract);
                setUser({ uid: authUser.uid, walletAddress: authUser.uid }); // Using uid as a placeholder for wallet address for now
                setLoading(false);
            } else {
                signInAnonymously(authInstance).then(anonUser => {
                    setUser({ uid: anonUser.user.uid, walletAddress: anonUser.user.uid });
                    setLoading(false);
                });
            }
        });

        // Farcaster data is typically passed via the client. This is a placeholder.
        // In a real Farcaster mini app, you'd use a SDK to get this data.
        const mockFarcasterData = {
            fid: '12345',
            pfp: 'https://i.pravatar.cc/100'
        };
        setFid(mockFarcasterData.fid);
        setPfp(mockFarcasterData.pfp);

        return () => unsubscribe();
    }, []);

    const renderView = () => {
        if (loading) {
            return <div className="flex items-center justify-center min-h-[50vh]">Loading app...</div>;
        }
        switch(view) {
            case 'gacha':
                return <GachaMachine auth={auth} db={db} user={user} contract={contract} />;
            case 'mycards':
                return <MyCards db={db} user={user} />;
            default:
                return null;
        }
    };

    return (
        <div className="bg-gray-900 text-gray-100 min-h-screen p-4 flex flex-col items-center">
            <div className="w-full max-w-4xl p-6 bg-gray-800 rounded-xl shadow-xl">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center space-x-4">
                        <img src={pfp} alt="Profile" className="w-10 h-10 rounded-full border-2 border-gray-400" />
                        <div>
                            <div className="font-bold text-lg">FID: {fid}</div>
                            <div className="text-sm text-gray-400">Welcome to the Gacha Machine!</div>
                        </div>
                    </div>
                    <div className="flex space-x-4">
                        <button onClick={() => setView('gacha')} className={`p-2 rounded-full transition-colors duration-200 ${view === 'gacha' ? 'bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                            <FaGift size={24} />
                        </button>
                        <button onClick={() => setView('mycards')} className={`p-2 rounded-full transition-colors duration-200 ${view === 'mycards' ? 'bg-red-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                            <BiCard size={24} />
                        </button>
                    </div>
                </div>
                <hr className="my-6 border-gray-700" />
                {renderView()}
            </div>
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<App />);
