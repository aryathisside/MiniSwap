const { ethers } = require("hardhat");

async function main() {
  console.log("Fixing WETH/USDC pair balance...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  
  // Deployed addresses from Sepolia
  const WETH_ADDRESS = "0xf6DF679a989765b23af413e0998d8652D1A9Ee67";
  const USDC_ADDRESS = "0x0587f8F70D6b5f28309078d0de732Fb690c6D4Be";
  const PAIR_ADDRESS = "0xA48bA2Ff1cC03243fdaf4aF0c5664b8Ce17f3471";
  
  try {
    // Get token contracts
    const weth = await ethers.getContractAt("MockERC20", WETH_ADDRESS);
    const usdc = await ethers.getContractAt("MockERC20", USDC_ADDRESS);
    const pair = await ethers.getContractAt("UniswapV2Pair", PAIR_ADDRESS);
    
    // Check current balances
    const wethBalance = await weth.balanceOf(deployer.address);
    const usdcBalance = await usdc.balanceOf(deployer.address);
    
    console.log("Deployer WETH Balance:", ethers.formatEther(wethBalance));
    console.log("Deployer USDC Balance:", ethers.formatUnits(usdcBalance, 6));
    
    // Mint more WETH if needed
    if (wethBalance < ethers.parseEther("100")) {
      console.log("Minting WETH...");
      await weth.mint(deployer.address, ethers.parseEther("1000"));
    }
    
    // Check current reserves
    const [reserve0Before, reserve1Before] = await pair.getReserves();
    console.log("Before - Reserve 0 (WETH):", ethers.formatEther(reserve0Before));
    console.log("Before - Reserve 1 (USDC):", ethers.formatUnits(reserve1Before, 6));
    
    // Transfer WETH directly to the pair to balance it
    console.log("Transferring WETH to pair...");
    await weth.transfer(PAIR_ADDRESS, ethers.parseEther("100"));
    
    // Call sync to update reserves
    console.log("Syncing reserves...");
    await pair.sync();
    
    // Check pair reserves after sync
    const [reserve0After, reserve1After] = await pair.getReserves();
    console.log("After - Reserve 0 (WETH):", ethers.formatEther(reserve0After));
    console.log("After - Reserve 1 (USDC):", ethers.formatUnits(reserve1After, 6));
    
    console.log(" Pair balance fixed!");
    
  } catch (error) {
    console.error("Error fixing pair balance:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 