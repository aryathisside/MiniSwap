# Uniswap V2 DEX - Complete DeFi Trading Platform

A full-featured decentralized exchange (DEX) built on Uniswap V2 protocol with a modern React frontend. This project implements a complete DeFi trading ecosystem including token swapping, liquidity provision, and automated market maker (AMM) functionality.

## 🌐 Live Project

**🔗 [Live Demo]()** *(Add your website link here when deployed)*

Experience the live trading platform with real-time token swaps and liquidity provision on Sepolia testnet.

## 📖 What is This Project?

This is a **complete Uniswap V2 implementation** that includes:

- **Smart Contracts**: Full Uniswap V2 protocol (Factory, Router, Pairs, Custom Tokens)
- **Frontend Interface**: Modern React-based trading interface
- **AMM Trading**: Automated market maker for token swaps
- **Liquidity Provision**: Add/remove liquidity to earn fees
- **Real-time Quotes**: Live price calculations and slippage protection

### Key Features
- 🔄 **Token Swapping**: Trade between WETH, USDT, and DAI
- 💧 **Liquidity Provision**: Add liquidity to pools and earn trading fees
- 📊 **Real-time Data**: Live price quotes and pool reserves
- 🔒 **Security**: Reentrancy protection and overflow safeguards
- 🎯 **Slippage Protection**: Configurable slippage tolerance
- 💳 **Wallet Integration**: MetaMask connectivity

## 🚀 Quick Start Guide

Follow these steps to set up and test the complete project:

### Prerequisites
- **Node.js** (v16 or higher)
- **MetaMask** browser extension
- **Sepolia ETH** (get from faucet)

### 1. Clone and Install

```bash
git clone <your-repository-url>
cd uniSwap

# Install dependencies
npm install

# Install frontend dependencies
cd frontend && npm install && cd ..
```

### 2. Environment Setup

Create `.env` file in root directory:

```env
# Sepolia RPC URL (get from Infura/Alchemy)
SEPOLIA_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# Your private key (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Etherscan API key (optional)
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### 3. Deploy to Sepolia (Optional)

If you want to deploy your own contracts:

```bash
# Deploy fresh contracts to Sepolia
npx hardhat run scripts/deploy-sepolia-simple.js --network sepolia
```

### 4. Use Existing Deployment

**Current Live Deployment on Sepolia:**

```
WETH:     0x0A7E11Caa2A5EFBa3bB1f2C67E795b41ddCBC453
USDT:     0x73Fd9eB3281fB56AafFE512bad7468C3e7a2C600
DAI:      0xba735403CcBd5969EDafa4Ec7AFf526C701B6690
Factory:  0xCAA878B49400A65468D7400ACf5651DB85C5441A
Router:   0x3DFF2A8F102Fd041a5E2c24C2a942EEb18e84794
Adapter:  0x8700A5FBb9D0CCa51a609926d98A002F22a03c0c
Pair:     0xD69D12CaA3D1bc7397D1a5Fc496D40e48Ef08877
```

### 5. Start Frontend

```bash
cd frontend
npm start
```

Visit `http://localhost:3000` to access the trading interface.

### 6. Add Test Tokens to MetaMask

Import these token addresses in MetaMask:

- **WETH**: `0x0A7E11Caa2A5EFBa3bB1f2C67E795b41ddCBC453`
- **USDT**: `0x73Fd9eB3281fB56AafFE512bad7468C3e7a2C600`  
- **DAI**: `0xba735403CcBd5969EDafa4Ec7AFf526C701B6690`

### 7. Get Test Tokens

Connect your wallet to the frontend and the contract will automatically mint test tokens for you to trade with.

## 🏗️ Project Architecture

```
uniSwap/
├── contracts/              # Smart Contracts
│   ├── UniswapV2Pair.sol    # AMM pair logic
│   ├── UniswapV2Router.sol  # Swap routing
│   ├── UniswapV2Factory.sol # Pair creation
│   ├── UniswapV2.sol        # Adapter contract
│   └── MockERC20.sol        # Test tokens
├── frontend/               # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── UniswapAdapter.js
│   │   ├── app.js
│   │   └── index.js
│   └── package.json
├── scripts/               # Deployment Scripts
│   └── deploy-sepolia-simple.js
└── sepolia-addresses.json # Contract addresses
```

## 💼 How to Test the Project

### 1. Connect Wallet
- Open the frontend at `http://localhost:3000`
- Click "Connect Wallet" and approve MetaMask connection
- Ensure you're on Sepolia testnet

### 2. Get Test Tokens
- The frontend will show your token balances
- If you need tokens, they will be automatically minted

### 3. Test Token Swapping
- Select tokens to swap (e.g., WETH → USDT)
- Enter amount and click "Get Quote"
- Review the quote and click "Swap"
- Confirm transaction in MetaMask

### 4. Test Liquidity Provision
- Go to "Add Liquidity" section
- Select token pair (e.g., WETH/USDT)
- Enter amounts and click "Add Liquidity"
- Confirm transaction to become a liquidity provider

### 5. View Pool Information
- Check pool reserves and your LP tokens
- View current exchange rates
- Monitor pool activity

## 🔧 Available Functions

### Trading Functions
- **Token Swaps**: Exchange tokens with automatic price calculation
- **Liquidity Addition**: Provide liquidity to earn fees
- **Quote Calculation**: Get real-time swap quotes
- **Slippage Protection**: Configurable protection against price impact

### Advanced Features
- **Multi-hop Swaps**: Automatic routing through multiple pairs
- **Pool Creation**: Create new trading pairs
- **LP Token Management**: Track liquidity provider positions
- **Fee Collection**: Earn 0.3% fees on all trades in your pools

## Security Features

- **Reentrancy Protection**: Prevents recursive calls
- **Overflow Protection**: SafeMath operations
- **Slippage Protection**: User-defined tolerance
- **Access Control**: Owner-only administrative functions
- **Emergency Recovery**: Token rescue functionality

## Important Notes

1. **Testnet Only**: This deployment is on Sepolia testnet
2. **Test Tokens**: All tokens are test tokens with no real value
3. **Gas Fees**: You need Sepolia ETH for transactions
4. **MetaMask**: Ensure you're connected to Sepolia network
5. **Slippage**: Set appropriate slippage for volatile markets

## Technical Specifications

- **Network**: Ethereum Sepolia Testnet
- **Protocol**: Uniswap V2
- **Frontend**: React + Ethers.js
- **Smart Contracts**: Solidity 0.8.x
- **Development**: Hardhat framework

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes and test thoroughly
4. Commit changes: `git commit -m 'Add new feature'`
5. Push to branch: `git push origin feature/new-feature`
6. Submit a pull request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support & Issues

For questions, issues, or support:

1. **GitHub Issues**: Create an issue with detailed description
2. **Include**: Network, contract addresses, error messages, and steps to reproduce
3. **Check**: Existing issues before creating new ones

## Links

### Live Project
- **Live Demo**: *(Add your live website link here)*
- **Documentation**: This README file

### Smart Contracts on Etherscan
- **WETH Token**: [0x0A7E11Caa2A5EFBa3bB1f2C67E795b41ddCBC453](https://sepolia.etherscan.io/address/0x0A7E11Caa2A5EFBa3bB1f2C67E795b41ddCBC453)
- **USDT Token**: [0x73Fd9eB3281fB56AafFE512bad7468C3e7a2C600](https://sepolia.etherscan.io/address/0x73Fd9eB3281fB56AafFE512bad7468C3e7a2C600)
- **DAI Token**: [0xba735403CcBd5969EDafa4Ec7AFf526C701B6690](https://sepolia.etherscan.io/address/0xba735403CcBd5969EDafa4Ec7AFf526C701B6690)
- **Factory Contract**: [0xCAA878B49400A65468D7400ACf5651DB85C5441A](https://sepolia.etherscan.io/address/0xCAA878B49400A65468D7400ACf5651DB85C5441A)
- **Router Contract**: [0x3DFF2A8F102Fd041a5E2c24C2a942EEb18e84794](https://sepolia.etherscan.io/address/0x3DFF2A8F102Fd041a5E2c24C2a942EEb18e84794)
- **Adapter Contract**: [0x8700A5FBb9D0CCa51a609926d98A002F22a03c0c](https://sepolia.etherscan.io/address/0x8700A5FBb9D0CCa51a609926d98A002F22a03c0c)
- **WETH/USDT Pair**: [0xD69D12CaA3D1bc7397D1a5Fc496D40e48Ef08877](https://sepolia.etherscan.io/address/0xD69D12CaA3D1bc7397D1a5Fc496D40e48Ef08877)

---

**⚡ Ready to experience DeFi trading? Get started now!**

