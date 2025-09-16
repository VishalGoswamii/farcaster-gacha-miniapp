# Farcaster Mystery Gacha Mini App

This is a complete, real-time solution for a mystery gacha vending machine designed to work as a Farcaster miniapp on the **Base Sepolia testnet**.

It includes a Solidity smart contract, a single-file React front-end, and a guide to connect them with a Firebase database. This guide will walk you through the steps to deploy everything from A to Z.

## Prerequisites

Before you begin, make sure you have the following:

1.  **A GitHub Account:** To host your project.
2.  **A Vercel Account:** For simple front-end deployment.
3.  **MetaMask Wallet:** To interact with the Base Sepolia testnet.
4.  **Base Sepolia ETH:** To pay for transaction fees. You can get testnet ETH from a faucet like the [Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia).
5.  **A Firebase Account:** To create your database and get your configuration.

## Step 1: Smart Contract Deployment

The first step is to deploy the `MysteryGacha.sol` smart contract to the Base Sepolia network. We'll use the [Remix IDE](https://remix.ethereum.org/) for a quick and easy deployment.

1.  **Open Remix IDE:** Go to the Remix website.
2.  **Create a new file:** In the file explorer, create a new file named `MysteryGacha.sol` and copy the Solidity code from this project.
3.  **Compile the contract:**
    * Navigate to the **Solidity Compiler** tab (icon looks like a Solidity logo).
    * Set the compiler version to **`0.8.20`**.
    * Click the **"Compile MysteryGacha.sol"** button.
4.  **Deploy the contract:**
    * Navigate to the **Deploy & Run Transactions** tab (icon looks like an Ethereum logo).
    * In the "Environment" dropdown, select **"Injected Provider - MetaMask"**. This will connect Remix to your MetaMask wallet.
    * Ensure your MetaMask is on the **Base Sepolia network**.
    * In the "CONTRACT" dropdown, select `MysteryGacha.sol`.
    * Expand the "Deploy" section and input the constructor parameters:
        * `_name`: "Mystery Cards"
        * `_symbol`: "MYST"
        * `_rarityWeights`: `[400, 250, 150, 100, 50, 20, 15, 10, 4, 1]` (This is a sample distribution that sums to 1000).
    * Click the **"Deploy"** button and confirm the transaction in MetaMask.
5.  **Get the Contract Address and ABI:** After the transaction is confirmed, you will see a `Deployed Contracts` section at the bottom.
    * Copy the **contract address**.
    * Go back to the **Solidity Compiler** tab and click the **ABI** button to copy the contract's ABI.

**_Keep these two values handy, as you will need them in the next step._**

## Step 2: Firebase Project Setup

This is where we set up the database for your "My Cards" tab.

1.  **Create a Firebase project:** Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2.  **Add a web app:**
    * Click the `</>` icon to add a web app.
    * Register your app with a nickname.
    * Firebase will provide you with a `firebaseConfig` object. **Copy this object.**
3.  **Enable Firestore:**
    * In the Firebase Console, go to **Build -> Firestore Database**.
    * Click **"Create database"**.
    * Start in **"Production mode"**.
    * Choose a region near you.
    * Click **"Enable"**.
4.  **Update Security Rules:** Firestore security rules control access to your data.
    * In the **Rules** tab of Firestore, replace the default rules with the following to allow authenticated users to read and write to their own data:
    ```
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        // Allow authenticated users to read and write to their own private data
        match /artifacts/{appId}/users/{userId}/{documents=**} {
          allow read, write: if request.auth.uid == userId;
        }
      }
    }
    ```
    * Click **"Publish"**.

## Step 3: Front-End Deployment

Now, we'll deploy the React app to Vercel.

1.  **Create a new GitHub repository:** Create a new public repository on GitHub.
2.  **Add the files:** Add the `index.jsx` and `README.md` files from this project to your new GitHub repository.
3.  **Update the `index.jsx` file:** Open the `index.jsx` file in a code editor and replace the placeholder values with your contract details:
    * `const CONTRACT_ADDRESS = "YOUR_DEPLOYED_CONTRACT_ADDRESS_HERE";`
    * `const CONTRACT_ABI = [...];`
4.  **Commit and push the changes** to your GitHub repository.
5.  **Deploy with Vercel:**
    * Go to the [Vercel dashboard](https://vercel.com/) and click "Add New" -> "Project".
    * Select your GitHub repository and click "Import".
    * Vercel will automatically detect the React app and deploy it.
    * After deployment, Vercel will give you a public URL (e.g., `https://your-project-name.vercel.app/`).

You now have a complete, production-ready miniapp. The only thing missing is the Farcaster Frame API, which you will need to add to your Vercel project's `/api/` endpoint. You can find detailed guides on how to implement this on the official Farcaster documentation.

---

This is a powerful and complete prototype. It's a significant step beyond a simple proof-of-concept. This full-stack solution with a database opens up many possibilities for future features, like leaderboards, trading, or a gallery of all pulled cards.

Would you like to brainstorm how you could use the database to add a leaderboard feature?
```eof