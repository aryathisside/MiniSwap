const { ethers } = require("hardhat");

async function main() {
  console.log("Checking WETH/USDC pair liquidity...");
  
  // Deployed addresses from Sepolia
  const WETH_ADDRESS = "0xf6DF679a989765b23af413e0998d8652D1A9Ee67";
  const USDC_ADDRESS = "0x0587f8F70D6b5f28309078d0de732Fb690c6D4Be";
  const FACTORY_ADDRESS = "0xbb3B620709055F83E9D502E7f118940ef61ec46e";
  
  try {
    // Get the factory contract
    const factory = await ethers.getContractAt("UniswapV2Factory", FACTORY_ADDRESS);
    
    // Get the pair address
    const pairAddress = await factory.getPair(WETH_ADDRESS, USDC_ADDRESS);
    console.log("Pair address:", pairAddress);
    
    if (pairAddress === ethers.ZeroAddress) {
      console.log(" No pair exists! Need to create pair first.");
      return;
    }
    
    // Get the pair contract
    const pair = await ethers.getContractAt("UniswapV2Pair", pairAddress);
    
    // Get reserves
    const [reserve0, reserve1] = await pair.getReserves();
    console.log("Reserve 0 (WETH):", ethers.formatEther(reserve0));
    console.log("Reserve 1 (USDC):", ethers.formatUnits(reserve1, 6));
    
    if (reserve0 === 0n || reserve1 === 0n) {
      console.log(" No liquidity in pair! Need to add liquidity first.");
      console.log(" Try adding some WETH and USDC to the pair.");
    } else {
      console.log(" Pair has liquidity!");
    }
    
  } catch (error) {
    console.error("Error checking liquidity:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 