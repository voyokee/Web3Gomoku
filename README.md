# Web3 Gomoku DApp Backend

This repository contains the backend smart contracts for a decentralized Gomoku (Five-in-a-Row) DApp built on the Ethereum blockchain. It uses Hardhat as the development environment.

The system allows players to create and join games, compete against each other with cryptocurrency stakes, and have the winner automatically receive the prize pool.

<br>

## Table of Contents
- [Architecture](#architecture)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
- [Usage](#usage)
  - [Compile](#compile)
  - [Test](#test)
  - [Deployment](#deployment)
- [License](#license)

<br>

---

## Architecture

The backend consists of two main smart contracts:

- **`UserVaultSystem.sol`**: Manages user accounts, balances, registration, login, and security features like account freezing. It acts as a secure vault for user funds.
- **`Gomoku.sol`**: Contains all the game logic, including creating/joining games, managing the board state, processing moves, and determining the winner. It interacts with `UserVaultSystem` to handle stakes but does not hold user funds long-term.

<br>

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/en/) (>=18.0.0)
- [NPM](https://www.npmjs.com/)

### Installation

1.  Clone the repository:
    ```sh
    git clone <YOUR_REPOSITORY_URL>
    cd Web3Gomoku
    ```
2.  Install dependencies:
    ```sh
    npm install
    ```

### Configuration

Create a `.env` file in the project root directory and add the following environment variables. This file is for sensitive information and should not be committed to version control.

```
SEPOLIA_RPC_URL="YOUR_ALCHEMY_OR_INFURA_RPC_URL"
PRIVATE_KEY="YOUR_WALLET_PRIVATE_KEY_WITHOUT_0x"
ETHERSCAN_API_KEY="YOUR_ETHERSCAN_API_KEY"
```

<br>

## Usage

### Compile

To compile the smart contracts, run:

```sh
npx hardhat compile
```

### Test

To run the unit tests for the contracts, execute:

```sh
npx hardhat test
```

### Deployment

The deployment process involves two steps and must be done in order.

**Step 1: Deploy `UserVaultSystem`**

Run the deployment script for the vault contract.

```sh
npx hardhat run scripts/deployUserVault.js --network sepolia
```

Copy the deployed contract address from the terminal output.

**Step 2: Deploy `Gomoku`**

1.  Open `scripts/deploy.js`.
2.  Paste the `UserVaultSystem` address you just copied into the `USER_VAULT_ADDRESS` variable.
3.  Run the deployment script for the Gomoku contract.

```sh
npx hardhat run scripts/deploy.js --network sepolia
```

**Step 3: Whitelist `Gomoku` contract**

After both contracts are deployed, you must call the `addToWhitelist` function on the `UserVaultSystem` contract, passing the `Gomoku` contract's address as the argument. This authorizes the game contract to manage stakes. This can be done via Etherscan's "Write Contract" interface.

---

## 🔧 Local Deployment Verification

Local deployment verification allows you to test the complete deployment process and contract functionality without spending real funds.

### Step 1: Install Dependencies

```bash
# First time setup after cloning
npm install

# If you encounter dependency conflicts
npm install --legacy-peer-deps
```

**Important Notes**:
- Project uses Hardhat 2.x (stable version)
- Configuration files and scripts use CommonJS syntax (`require`/`module.exports`)
- If `package.json` contains `"type": "module"`, Hardhat 2.x will fail

### Step 2: Compile Contracts

```bash
npx hardhat compile
```

**Expected Output**:
```
Compiled 4 Solidity files successfully (evm target: paris).
```

**Common Issues**:

**Q: SSL Certificate Error**
```
Error HH502: Couldn't download compiler version list.
Caused by: Error: unable to get local issuer certificate
```

**Solution** (Development only):
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npx hardhat compile
```

### Step 3: Start Local Hardhat Node

In a **new terminal window**, run:

```bash
npx hardhat node
```

This starts a local Ethereum node and automatically creates 20 test accounts, each with 10,000 ETH.

**Expected Output**:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
...
```

⚠️ **Keep this terminal window running**.

### Step 4: Deploy Contracts to Local Network

In **another terminal window**, run:

```bash
npx hardhat run scripts/deployComplete.js --network localhost
```

This script will **automatically**:
1. ✅ Deploy `UserVaultSystem` contract
2. ✅ Deploy `Gomoku` contract
3. ✅ Add `Gomoku` to `UserVaultSystem` whitelist
4. ✅ Verify configuration

**Expected Output**:
```
==================== Starting Deployment ====================
Deploying Account: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Account Balance: 10000.0 ETH

📦 Step 1/4: Deploying UserVaultSystem contract...
✅ UserVaultSystem deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
   - Owner: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
   - Initial Pool Balance: 100.0 ETH

📦 Step 2/4: Deploying Gomoku contract...
✅ Gomoku deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
   - UserVault Reference: 0x5FbDB2315678afecb367f032d93F642f64180aa3
   - Owner: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 

🔑 Step 3/4: Adding Gomoku to UserVaultSystem whitelist...
✅ Whitelist configured successfully
   - Transaction Hash: 0x8df08c93805270de8f85dd00ab281859982f3c885b95414139269fcbc8484502 

🔍 Step 4/4: Verifying deployment and configuration...
   - Is Gomoku whitelisted: ✅ Yes

==================== Deployment Successful ====================
📝 Contract Addresses:
   UserVaultSystem: 0x5FbDB2315678afecb367f032d93F642f64180aa3
   Gomoku:          0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
```

### Step 5: Interact with Contracts (Optional)

Use Hardhat Console to interact with deployed contracts:

```bash
npx hardhat console --network localhost
```

In the console:

```javascript
// Connect to deployed contracts (use addresses from previous step)
const userVault = await ethers.getContractAt(
  "UserVaultSystem", 
  "0x5FbDB2315678afecb367f032d93F642f64180aa3"
);

const gomoku = await ethers.getContractAt(
  "Gomoku", 
  "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
);

// Verify whitelist configuration
await userVault.isAdmin(await gomoku.getAddress());
// Should return: true

// Check pool balance
await userVault.gamePoolBalance();
// Should return: 100000000000000000000n (100 ETH)

// Get test accounts
const [owner, player1, player2] = await ethers.getSigners();

// Simulate user registration
await userVault.connect(player1).registerUser("Alice", "password123");
await userVault.connect(player1).login("password123");

// Deposit to personal balance
await userVault.connect(player1).deposit({ value: ethers.parseEther("5") });

// Check balance
const info = await userVault.connect(player1).getUserInfo();
console.log("Username:", info.username);
console.log("Balance:", ethers.formatEther(info.balance), "ETH");

// Push to pool
await userVault.connect(player1).pushToPool(ethers.parseEther("1"));

// Create game
await gomoku.connect(player1).createGame(ethers.parseEther("1"));

// Get game details
const game = await gomoku.getGameDetails(1);
console.log("Game Creator:", game.players[0]);
console.log("Stake:", ethers.formatEther(game.stake), "ETH");
```

### Step 6: Run Tests (Optional)

```bash
npx hardhat test --network localhost
```

### Local Deployment Verification Summary

| Checkpoint | Command | Expected Result |
|------------|---------|-----------------|
| Dependencies | `npm install` | No errors |
| Compilation | `npx hardhat compile` | 4 files compiled successfully |
| Local Node | `npx hardhat node` | Shows 20 test accounts |
| Deployment | `npx hardhat run scripts/deployComplete.js --network localhost` | Shows both contract addresses |
| Whitelist | Console: `userVault.isAdmin(gomokuAddress)` | Returns `true` |

### Troubleshooting

#### Q1: Compiler Download Fails

**Error**:
```
Error HH502: Couldn't download compiler version list.
```

**Solution**:
```bash
# Method 1: Use environment variable (dev only)
NODE_TLS_REJECT_UNAUTHORIZED=0 npx hardhat compile

# Method 2: Check network connection
# Method 3: Use proxy (if needed)
```

#### Q2: Module Error in Deployment Script

**Error**:
```
SyntaxError: Named export 'ethers' not found
```

**Cause**: Hardhat 2.x requires CommonJS syntax

**Solution**:
Ensure `package.json` does **NOT** have `"type": "module"`, and scripts use `require` instead of `import`

#### Q3: Cannot Connect to localhost Network

**Error**:
```
Error: could not detect network
```

**Solution**:
1. Ensure local node is running (`npx hardhat node`)
2. Check node logs confirm listening on `http://127.0.0.1:8545`
3. Restart local node

#### Q4: Whitelist Configuration Failed

**Error**:
```
Not owner or whitelist
```

**Cause**: Deploying account is not UserVaultSystem owner

**Solution**:
Ensure using same account to deploy both contracts and configure whitelist (`deployComplete.js` handles this automatically)

<br>

## License

This project is licensed under the MIT License.
