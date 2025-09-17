@"
# Farcaster Gacha Miniapp

A full-stack Farcaster miniapp for a mystery gacha vending machine, built with React, Solidity, and Firebase. This app allows users to pull a free NFT on the Base Sepolia testnet and view their collection.

## Deployment Guide

This guide provides a detailed, step-by-step process for deploying the smart contract, setting up Firebase, and deploying the React application.

### Step 1: Deploy the Smart Contract

You will use Remix IDE, a web-based integrated development environment for Ethereum, to deploy \`MysteryGacha.sol\`.

1.  **Open Remix IDE:** Navigate to \`https://remix.ethereum.org/\`.
2.  **Create a New File:** In the file explorer on the left, click the file icon to create a new file and name it \`MysteryGacha.sol\`.
3.  **Paste the Code:** Copy the content of \`contracts/MysteryGacha.sol\` into the new file in Remix.
4.  **Compile the Contract:**
    * Click the **Solidity Compiler** tab (icon looks like a solid cube).
    * Ensure the **Compiler version** is set to \`0.8.20\`.
    * Click the **"Compile MysteryGacha.sol"** button. If the compilation is successful, a green checkmark will appear.
5.  **Deploy the Contract:**
    * Click the **Deploy & Run Transactions** tab (icon looks like an Ethereum logo).
    * In the **ENVIRONMENT** dropdown, select **Injected Provider - MetaMask**. This will connect Remix to your MetaMask wallet.
    * Make sure your MetaMask is connected to the **Base Sepolia Testnet**.
    * Under the **CONTRACT** dropdown, select \`MysteryGacha\`.
    * Click the **"Deploy"** button.
6.  **Confirm the Transaction:** MetaMask will pop up, asking you to confirm the transaction. Confirm it.
7.  **Get the Contract Address:** Once the transaction is confirmed, you will see the deployed contract under the **Deployed Contracts** section. Copy the contract address from here. This address is \`YOUR_CONTRACT_ADDRESS\` in the \`index.jsx\` file.

### Step 2: Set up Firebase

You will use Firebase to store the cards pulled by users.

1.  **Create a Firebase Project:**
    * Go to the Firebase Console: \`https://console.firebase.google.com/\`.
    * Click **"Add project"** and follow the prompts to create a new project.
2.  **Add a Web App:**
    * In your new project's dashboard, click the web icon (\`</>\`) to add a web app.
    * Register your app and copy the Firebase configuration object. This is your \`firebaseConfig\` object in the \`index.jsx\` file.
3.  **Set up Firestore Database:**
    * In the Firebase console, go to the **"Build"** section and select **"Firestore Database"**.
    * Click **"Create database"**.
    * Choose a starting mode. Select **"Start in production mode"** and click **"Next"**.
    * Choose a location for your database and click **"Enable"**.
4.  **Configure Firestore Security Rules:**
    * In the Firestore Database section, navigate to the **"Rules"** tab.
    * Paste the following rules to allow read and write access to the \`cards\` collection for authenticated users. This is important for a basic example. For a production app, you would add more granular rules.
    \`\`\`
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /cards/{cardId} {
          allow read, write: if request.auth != null;
        }
      }
    }
    \`\`\`
    * Click **"Publish"** to save the rules.
5.  **Enable Authentication:**
    * In the Firebase console, go to the **"Build"** section and select **"Authentication"**.
    * Click **"Get started"** and then select **"Anonymous"** as a sign-in method. For this specific application, we are not using Firebase authentication, but this is a good first step for future expansion. The \`request.auth != null\` rule will still work in conjunction with a user's wallet address as the identifier.

### Step 3: Configure and Deploy the React App

You will now configure the React app with your contract and Firebase details, then deploy it to Vercel.

1.  **Set up Project Locally:**
    * Ensure you have Node.js and npm installed.
    * Navigate to your project folder in the terminal.
    * Install all dependencies: \`npm install\`.
2.  **Update \`index.jsx\`:**
    * Open \`src/index.jsx\`.
    * Replace \`YOUR_API_KEY\`, \`YOUR_AUTH_DOMAIN\`, etc., with the Firebase configuration values you copied in Step 2.
    * Replace \`YOUR_CONTRACT_ADDRESS\` with the address of the deployed smart contract you got in Step 1.
3.  **Deploy to Vercel:**
    * If you don't have Vercel CLI, install it: \`npm install -g vercel\`.
    * Log in to Vercel from your terminal: \`vercel login\`.
    * Deploy the project: \`vercel\`.
    * Follow the prompts to link your project and deploy. Vercel will detect it's a React project and handle the build process automatically.
4.  **Add Vercel Environment Variables (Optional but recommended for production):**
    * For a production setup, you would add the Firebase API keys as environment variables in Vercel. You can do this in the Vercel dashboard for your project under **Settings > Environment Variables**.
    * Example: \`FIREBASE_API_KEY\`, \`FIREBASE_PROJECT_ID\`, etc. You would then read these variables in your React code using \`process.env.FIREBASE_API_KEY\`.

After following these steps, your full-stack Farcaster miniapp will be live and ready for users to connect their wallets and pull NFTs!
"@ | Set-Content -Path "README.md" -Force