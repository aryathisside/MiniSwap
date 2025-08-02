import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Wallet, ArrowDownUp, Plus, Loader, AlertCircle, CheckCircle } from 'lucide-react';

// Contract ABI (simplified for the main functions)
const ADAPTER_ABI = [
  "function addLiquidity(address tokenA, address tokenB, uint256 amountA, uint256 amountB, uint256 slippageTolerance) external returns (uint256, uint256, uint256)",
  "function swapExactInput(address tokenIn, address tokenOut, uint256 amountIn, uint256 minOut) external returns (uint256)",
  "function getQuote(address tokenIn, address tokenOut, uint256 amountIn) external view returns (uint256)",
  "function getReserves(address tokenA, address tokenB) external view returns (uint256, uint256)"
];

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];

// Token addresses for Sepolia deployment
const TOKENS = {
  WETH: {
    address: "0x0A7E11Caa2A5EFBa3bB1f2C67E795b41ddCBC453",
    symbol: "WETH",
    decimals: 18
  },
  USDT: {
    address: "0x73Fd9eB3281fB56AafFE512bad7468C3e7a2C600",
    symbol: "USDT",
    decimals: 6
  },
  DAI: {
    address: "0xba735403CcBd5969EDafa4Ec7AFf526C701B6690",
    symbol: "DAI",
    decimals: 18
  }
};

// Contract addresses (SEPOLIA)
const ADAPTER_CONTRACT_ADDRESS = "0x8700A5FBb9D0CCa51a609926d98A002F22a03c0c";
const ROUTER_CONTRACT_ADDRESS = "0x3DFF2A8F102Fd041a5E2c24C2a942EEb18e84794";
const FACTORY_CONTRACT_ADDRESS = "0xCAA878B49400A65468D7400ACf5651DB85C5441A";

const UniswapAdapter = () => {
  console.log("Frontend loaded - Sepolia contracts");
  console.log("WETH:", TOKENS.WETH.address);
  console.log("USDT:", TOKENS.USDT.address);
  console.log("DAI:", TOKENS.DAI.address);
  console.log("Adapter:", ADAPTER_CONTRACT_ADDRESS);
  console.log("Router:", ROUTER_CONTRACT_ADDRESS);
  console.log("Factory:", FACTORY_CONTRACT_ADDRESS);
  
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Swap state
  const [tokenIn, setTokenIn] = useState('WETH');
  const [tokenOut, setTokenOut] = useState('USDT');
  const [amountIn, setAmountIn] = useState('');
  const [quote, setQuote] = useState('');
  const [slippage, setSlippage] = useState('1');
  
  // Liquidity pool state
  const [poolReserves, setPoolReserves] = useState({ reserve0: '0', reserve1: '0', hasLiquidity: false });
  
  // Liquidity state
  const [liquidityTokenA, setLiquidityTokenA] = useState('WETH');
  const [liquidityTokenB, setLiquidityTokenB] = useState('USDT');
  const [amountA, setAmountA] = useState('');
  const [amountB, setAmountB] = useState('');
  
  // Balances
  const [balances, setBalances] = useState({});
  
  // Tab state
  const [activeTab, setActiveTab] = useState('swap');
  
  // Network state
  const [currentNetwork, setCurrentNetwork] = useState('');
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);

  // Sepolia network configuration
  const SEPOLIA_CHAIN_ID = '0xaa36a7'; // 11155111 in hex
  const SEPOLIA_NETWORK = {
    chainId: SEPOLIA_CHAIN_ID,
    chainName: 'Sepolia Testnet',
    nativeCurrency: {
      name: 'Sepolia Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['https://sepolia.infura.io/v3/'],
    blockExplorerUrls: ['https://sepolia.etherscan.io/'],
  };

  // Check and switch to Sepolia network
  const checkAndSwitchNetwork = async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed');
      return false;
    }

    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      
      if (chainId !== SEPOLIA_CHAIN_ID) {
        try {
          // Try to switch to Sepolia
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          });
        } catch (switchError) {
          // If Sepolia is not added, add it
          if (switchError.code === 4902) {
            try {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [SEPOLIA_NETWORK],
              });
            } catch (addError) {
              setError('Failed to add Sepolia network to MetaMask');
              return false;
            }
          } else {
            setError('Please switch to Sepolia network in MetaMask');
            return false;
          }
        }
      }
      return true;
    } catch (error) {
      setError('Failed to check network: ' + error.message);
      return false;
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('MetaMask is not installed');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Check and switch to Sepolia network
      const networkOk = await checkAndSwitchNetwork();
      if (!networkOk) {
        setLoading(false);
        return;
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(ADAPTER_CONTRACT_ADDRESS, ADAPTER_ABI, signer);

      setAccount(accounts[0]);
      setProvider(provider);
      setSigner(signer);
      setContract(contract);
      
      // Load balances
      await loadBalances(accounts[0], provider);
    } catch (error) {
      setError(`Failed to connect wallet: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Check current network
  const checkCurrentNetwork = async () => {
    if (!window.ethereum) return;
    
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const isSepolia = chainId === SEPOLIA_CHAIN_ID;
      
      setCurrentNetwork(isSepolia ? 'Sepolia' : 'Wrong Network');
      setIsCorrectNetwork(isSepolia);
      
      if (!isSepolia && account) {
        setError('Please switch to Sepolia network to use this dApp');
      }
    } catch (error) {
      console.error('Failed to check network:', error);
    }
  };

  // Load token balances
  const loadBalances = async (address, provider) => {
    console.log("DEBUG: Loading balances...");
    console.log("- User account:", address);
    
    // Check network
    const network = await provider.getNetwork();
    console.log("- Connected network:", network.name, "Chain ID:", network.chainId.toString());
    console.log("- Expected Sepolia Chain ID: 11155111");
    
    if (network.chainId.toString() !== "11155111") {
      console.error("WRONG NETWORK! Please switch to Sepolia testnet");
      setError("Please switch to Sepolia testnet");
      return;
    }
    
    const newBalances = {};
    
    for (const [symbol, token] of Object.entries(TOKENS)) {
      try {
        console.log(`Calling ${symbol} balanceOf on`, token.address);
        const tokenContract = new ethers.Contract(token.address, ERC20_ABI, provider);
        const balance = await tokenContract.balanceOf(address);
        newBalances[symbol] = ethers.formatUnits(balance, token.decimals);
        console.log(`${symbol} balance:`, newBalances[symbol]);
      } catch (error) {
        console.error(`Failed to load ${symbol} balance:`, error);
        newBalances[symbol] = '0';
      }
    }
    
    setBalances(newBalances);
  };

  // Get quote for swap
  const getSwapQuote = async (tokenInSymbol, tokenOutSymbol, amount) => {
    if (!contract || !amount || amount === '0') {
      setQuote('');
      return;
    }

    try {
      const tokenInAddr = TOKENS[tokenInSymbol].address;
      const tokenOutAddr = TOKENS[tokenOutSymbol].address;
      const tokenInDecimals = TOKENS[tokenInSymbol].decimals;
      const tokenOutDecimals = TOKENS[tokenOutSymbol].decimals;
      
      const amountInWei = ethers.parseUnits(amount, tokenInDecimals);
      const quoteWei = await contract.getQuote(tokenInAddr, tokenOutAddr, amountInWei);
      const quoteFormatted = ethers.formatUnits(quoteWei, tokenOutDecimals);
      
      // Round to appropriate decimal places to avoid precision issues
      const quoteRounded = parseFloat(quoteFormatted).toFixed(tokenOutDecimals);
      
      // Debug logging
      console.log('Quote Calculation:');
      console.log('- Quote in Wei:', quoteWei.toString());
      console.log('- Quote formatted:', quoteFormatted);
      console.log('- Quote rounded:', quoteRounded);
      console.log('- Token decimals:', tokenOutDecimals);
      
      setQuote(quoteRounded);
    } catch (error) {
      console.error('Failed to get quote:', error);
      setQuote('');
    }
  };

  // Execute swap
  const executeSwap = async () => {
    if (!contract || !amountIn || !quote) return;
    
    if (!isCorrectNetwork) {
      setError('Please switch to Sepolia network to perform swaps');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const tokenInAddr = TOKENS[tokenIn].address;
      const tokenOutAddr = TOKENS[tokenOut].address;
      const tokenInDecimals = TOKENS[tokenIn].decimals;
      const tokenOutDecimals = TOKENS[tokenOut].decimals;
      
      const amountInWei = ethers.parseUnits(amountIn, tokenInDecimals);
      // Calculate minimum output with slippage protection
      const slippageDecimal = parseFloat(slippage) / 100; // Convert percentage to decimal (1% = 0.01)
      const minOutAmount = parseFloat(quote) * (1 - slippageDecimal);
      
      // Round to appropriate decimal places to avoid precision issues
      const minOutAmountRounded = parseFloat(minOutAmount.toFixed(tokenOutDecimals));
      const minOutWei = ethers.parseUnits(minOutAmountRounded.toString(), tokenOutDecimals);
      
      // Debug logging
      console.log('Swap Parameters:');
      console.log('- Quote:', quote);
      console.log('- Slippage:', slippage, '%');
      console.log('- Min out amount:', minOutAmount);
      console.log('- Min out rounded:', minOutAmountRounded);
      console.log('- Min out Wei:', minOutWei.toString());
      console.log('- Token decimals:', tokenOutDecimals);
      
      // Add warning for very small amounts
      if (parseFloat(amountIn) < 0.0001) {
        console.warn('Very small input amount detected. This may cause issues with the current pair reserves.');
      }

      // First approve the adapter contract to spend tokens
      const tokenContract = new ethers.Contract(tokenInAddr, ERC20_ABI, signer);
      const allowance = await tokenContract.allowance(account, ADAPTER_CONTRACT_ADDRESS);
      
      if (allowance < amountInWei) {
        const approveTx = await tokenContract.approve(ADAPTER_CONTRACT_ADDRESS, amountInWei);
        await approveTx.wait();
      }

      // Execute swap
      const swapTx = await contract.swapExactInput(
        tokenInAddr,
        tokenOutAddr,
        amountInWei,
        minOutWei
      );
      
      await swapTx.wait();
      
      setSuccess(`Successfully swapped ${amountIn} ${tokenIn} for ${tokenOut}!`);
      setAmountIn('');
      setQuote('');
      
      // Reload balances
      await loadBalances(account, provider);
    } catch (error) {
      setError(`Swap failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate correct ratio for liquidity
  const calculateCorrectRatio = (wethAmount) => {
    // Use current pool reserves if available, otherwise use default ratio
    if (poolReserves.hasLiquidity && parseFloat(poolReserves.reserve0) > 0) {
      const currentRatio = parseFloat(poolReserves.reserve1) / parseFloat(poolReserves.reserve0);
      return (parseFloat(wethAmount) * currentRatio).toFixed(6);
    }
    // Default ratio for initial setup: 1 WETH = 2000 USDT
    const defaultRatio = 2000;
    return (parseFloat(wethAmount) * defaultRatio).toFixed(6);
  };

  // Check pool liquidity status
  const checkPoolLiquidity = async () => {
    if (!contract) return;
    
    try {
          const tokenAAddr = TOKENS.WETH.address;
    const tokenBAddr = TOKENS.USDT.address;
      
      const reserves = await contract.getReserves(tokenAAddr, tokenBAddr);
      const reserve0 = ethers.formatUnits(reserves[0], 18); // WETH
      const reserve1 = ethers.formatUnits(reserves[1], 6);  // USDT
      
      const hasLiquidity = parseFloat(reserve0) > 0 && parseFloat(reserve1) > 0;
      
      setPoolReserves({
        reserve0,
        reserve1,
        hasLiquidity
      });
      
      console.log("Pool Liquidity Status:");
      console.log("- WETH Reserve:", reserve0);
      console.log("- USDT Reserve:", reserve1);
      console.log("- Has Liquidity:", hasLiquidity);
      
    } catch (error) {
      console.error('Failed to check pool liquidity:', error);
      setPoolReserves({ reserve0: '0', reserve1: '0', hasLiquidity: false });
    }
  };

  // Add liquidity
  const addLiquidity = async () => {
    if (!contract || !amountA || !amountB) return;
    
    if (!isCorrectNetwork) {
      setError('Please switch to Sepolia network to add liquidity');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const tokenAAddr = TOKENS[liquidityTokenA].address;
      const tokenBAddr = TOKENS[liquidityTokenB].address;
      const tokenADecimals = TOKENS[liquidityTokenA].decimals;
      const tokenBDecimals = TOKENS[liquidityTokenB].decimals;
      
      const amountAWei = ethers.parseUnits(amountA, tokenADecimals);
      const amountBWei = ethers.parseUnits(amountB, tokenBDecimals);
      const slippageBP = parseInt(parseFloat(slippage) * 100); // Convert percentage to basis points (1% = 100, 0.5% = 50)
      
      // Debug logging
      console.log('Liquidity Parameters:');
      console.log('- User input amountA:', amountA, liquidityTokenA);
      console.log('- User input amountB:', amountB, liquidityTokenB);
      console.log('- User input slippage:', slippage, '%');
      console.log('- Calculated amountAWei:', amountAWei.toString());
      console.log('- Calculated amountBWei:', amountBWei.toString());
      console.log('- Calculated slippageBP:', slippageBP);

      // Approve both tokens
      const tokenAContract = new ethers.Contract(tokenAAddr, ERC20_ABI, signer);
      const tokenBContract = new ethers.Contract(tokenBAddr, ERC20_ABI, signer);
      
      const allowanceA = await tokenAContract.allowance(account, ADAPTER_CONTRACT_ADDRESS);
      const allowanceB = await tokenBContract.allowance(account, ADAPTER_CONTRACT_ADDRESS);
      
      if (allowanceA < amountAWei) {
        const approveTx = await tokenAContract.approve(ADAPTER_CONTRACT_ADDRESS, amountAWei);
        await approveTx.wait();
      }
      
      if (allowanceB < amountBWei) {
        const approveTx = await tokenBContract.approve(ADAPTER_CONTRACT_ADDRESS, amountBWei);
        await approveTx.wait();
      }

      // Add liquidity
      const liquidityTx = await contract.addLiquidity(
        tokenAAddr,
        tokenBAddr,
        amountAWei,
        amountBWei,
        slippageBP
      );
      
      await liquidityTx.wait();
      
      setSuccess(`Successfully added liquidity for ${liquidityTokenA}/${liquidityTokenB}!`);
      setAmountA('');
      setAmountB('');
      
      // Reload balances and check liquidity
      await loadBalances(account, provider);
      await checkPoolLiquidity();
    } catch (error) {
      console.error('Add liquidity error:', error);
      
      // Check if it's a ratio error and provide helpful message
      if (error.message.includes('INSUFFICIENT_A_AMOUNT') || error.message.includes('INSUFFICIENT_B_AMOUNT')) {
        setError('Amount ratio is incorrect! Please use appropriate amounts for the WETH/USDT pair.');
      } else {
        setError(`Add liquidity failed: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Check network on mount and when account changes
  useEffect(() => {
    if (window.ethereum) {
      checkCurrentNetwork();
      
      // Listen for network changes
      const handleChainChanged = () => {
        checkCurrentNetwork();
      };

      window.ethereum.on('chainChanged', handleChainChanged);
      
      return () => {
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [account]);

  // Update quote when inputs change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      getSwapQuote(tokenIn, tokenOut, amountIn);
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [tokenIn, tokenOut, amountIn, contract]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError('');
        setSuccess('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Check pool liquidity when contract loads
  useEffect(() => {
    if (contract) {
      checkPoolLiquidity();
    }
  }, [contract]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Uniswap V2 Adapter</h1>
          <p className="text-gray-600">Simplified DEX interactions</p>
        </div>

        {/* Network Status */}
        {account && (
          <div className="bg-white rounded-2xl shadow-lg p-4 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Network:</span>
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${
                isCorrectNetwork 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {currentNetwork}
              </span>
            </div>
            {!isCorrectNetwork && account && (
              <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                                        Please switch to Sepolia network to use this dApp
                </p>
                <button
                  onClick={checkAndSwitchNetwork}
                  className="mt-2 text-xs bg-yellow-600 text-white px-3 py-1 rounded hover:bg-yellow-700"
                >
                  Switch to Sepolia
                </button>
              </div>
            )}
          </div>
        )}

        {/* Wallet Connection */}
        {!account ? (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <button
              onClick={connectWallet}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Wallet className="w-5 h-5" />
              )}
              {loading ? 'Connecting...' : 'Connect MetaMask'}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Connected Account</p>
              <p className="font-mono text-sm bg-gray-100 rounded-lg p-2">
                {account.slice(0, 6)}...{account.slice(-4)}
              </p>
            </div>
            
            {/* Balances */}
            <div className="mt-4 grid grid-cols-2 gap-4">
              {Object.entries(TOKENS).map(([symbol, token]) => (
                <div key={symbol} className="text-center">
                  <p className="text-xs text-gray-500">{symbol}</p>
                  <p className="font-semibold">
                    {parseFloat(balances[symbol] || '0').toFixed(4)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {account && (
          <>
            {/* Network Warning */}
            {!isCorrectNetwork && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Wrong Network
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>This dApp only works on Sepolia testnet. Please switch networks to continue.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div className="bg-white rounded-2xl shadow-lg p-2 mb-6">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActiveTab('swap')}
                  className={`py-2 px-4 rounded-xl font-medium transition-colors ${
                    activeTab === 'swap'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <ArrowDownUp className="w-4 h-4 inline mr-2" />
                  Swap
                </button>
                <button
                  onClick={() => setActiveTab('liquidity')}
                  className={`py-2 px-4 rounded-xl font-medium transition-colors ${
                    activeTab === 'liquidity'
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Liquidity
                </button>
              </div>
            </div>

            {/* Swap Tab */}
            {activeTab === 'swap' && (
              <div className={`bg-white rounded-2xl shadow-lg p-6 mb-6 ${!isCorrectNetwork ? 'opacity-50 pointer-events-none' : ''}`}>
                <h2 className="text-xl font-semibold mb-4">Token Swap</h2>
                
                {/* Liquidity Pool Status */}
                <div className={`mb-4 p-3 rounded-xl border ${poolReserves.hasLiquidity ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${poolReserves.hasLiquidity ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                    <span className="text-sm font-medium text-gray-700">
                      Pool Status: {poolReserves.hasLiquidity ? 'Active' : 'No Liquidity'}
                    </span>
                  </div>
                  {poolReserves.hasLiquidity ? (
                    <div className="text-xs text-gray-600">
                                      <div>WETH Reserve: {parseFloat(poolReserves.reserve0).toFixed(4)} WETH</div>
                <div>USDT Reserve: {parseFloat(poolReserves.reserve1).toFixed(2)} USDT</div>
                <div>Rate: 1 WETH = {(parseFloat(poolReserves.reserve1) / parseFloat(poolReserves.reserve0)).toFixed(2)} USDT</div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600">
                      No liquidity available. Add liquidity first to enable swapping.
                    </div>
                  )}
                </div>
                
                {/* Token In */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                  <div className="flex gap-2">
                    <select
                      value={tokenIn}
                      onChange={(e) => setTokenIn(e.target.value)}
                      className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Object.keys(TOKENS).map(symbol => (
                        <option key={symbol} value={symbol}>{symbol}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="0.0"
                      value={amountIn}
                      onChange={(e) => setAmountIn(e.target.value)}
                      className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Token Out */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                  <div className="flex gap-2">
                    <select
                      value={tokenOut}
                      onChange={(e) => setTokenOut(e.target.value)}
                      className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Object.keys(TOKENS).map(symbol => (
                        <option key={symbol} value={symbol}>{symbol}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="0.0"
                      value={quote}
                      readOnly
                      className="flex-1 p-3 border border-gray-300 rounded-xl bg-gray-50"
                    />
                  </div>
                </div>

                {/* Slippage */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slippage Tolerance (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Swap Button */}
                <button
                  onClick={executeSwap}
                  disabled={loading || !amountIn || !quote || tokenIn === tokenOut}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <ArrowDownUp className="w-5 h-5" />
                  )}
                  {loading ? 'Swapping...' : 'Swap Tokens'}
                </button>
              </div>
            )}

            {/* Liquidity Tab */}
            {activeTab === 'liquidity' && (
              <div className={`bg-white rounded-2xl shadow-lg p-6 mb-6 ${!isCorrectNetwork ? 'opacity-50 pointer-events-none' : ''}`}>
                <h2 className="text-xl font-semibold mb-4">Add Liquidity</h2>
                
                {/* Token A */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Token A</label>
                  <div className="flex gap-2">
                    <select
                      value={liquidityTokenA}
                      onChange={(e) => setLiquidityTokenA(e.target.value)}
                      className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Object.keys(TOKENS).map(symbol => (
                        <option key={symbol} value={symbol}>{symbol}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="0.0"
                      value={amountA}
                      onChange={(e) => setAmountA(e.target.value)}
                      className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Token B */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Token B</label>
                  <div className="flex gap-2">
                    <select
                      value={liquidityTokenB}
                      onChange={(e) => setLiquidityTokenB(e.target.value)}
                      className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {Object.keys(TOKENS).map(symbol => (
                        <option key={symbol} value={symbol}>{symbol}</option>
                      ))}
                    </select>
                    <div className="flex gap-2 flex-1">
                      <input
                        type="number"
                        placeholder="0.0"
                        value={amountB}
                        onChange={(e) => setAmountB(e.target.value)}
                        className="flex-1 p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {liquidityTokenA === 'WETH' && liquidityTokenB === 'USDT' && (
                        <button
                          type="button"
                          onClick={() => {
                            if (amountA) {
                              console.log('Auto button clicked!');
                              console.log('Current amountA:', amountA);
                                              const correctUsdt = calculateCorrectRatio(amountA);
                console.log('Calculated correctUsdt:', correctUsdt);
                setAmountB(correctUsdt);
                console.log('AmountB should now be set to:', correctUsdt);
                            }
                          }}
                          className="px-4 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 text-sm font-medium"
                          title="Auto-calculate correct USDT amount"
                        >
                          Auto
                        </button>
                      )}
                    </div>
                  </div>
                                     {liquidityTokenA === 'WETH' && liquidityTokenB === 'USDT' && (
                     <p className="text-xs text-gray-500 mt-1">
                       Click "Auto" to calculate correct USDT amount based on current reserves
                     </p>
                   )}
                </div>

                {/* Slippage for Liquidity */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slippage Tolerance (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    max="10"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Add Liquidity Button */}
                <button
                  onClick={addLiquidity}
                  disabled={loading || !amountA || !amountB || liquidityTokenA === liquidityTokenB}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Plus className="w-5 h-5" />
                  )}
                  {loading ? 'Adding Liquidity...' : 'Add Liquidity'}
                </button>
              </div>
            )}

            {/* Status Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <p className="text-green-700 text-sm">{success}</p>
              </div>
            )}

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h3 className="font-semibold text-blue-800 mb-2">Important Notes:</h3>
              <ul className="text-blue-700 text-sm space-y-1">
                <li>• Make sure you have sufficient token balances</li>
                <li>• Approve token spending before transactions</li>
                <li>• Slippage protects against price changes</li>
                <li>• Gas fees apply to all transactions</li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default UniswapAdapter;