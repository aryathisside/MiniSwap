const { ethers } = require("hardhat");

async function main() {
  console.log("Adding liquidity directly to pair...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  
  // New deployed addresses from Sepolia
  const WETH_ADDRESS = "0x0ECf2c5d3a0dD46017E998D08816eD71ec2a55Ef";
  const USDC_ADDRESS = "0x657f7d12A851fDfC7beC3b8967Fa6f39Be14963E";
  const PAIR_ADDRESS = "0xFD5C07971ce34499C2Cdea94E14b76B2cc7f197B";
  
  try {
    // Get token contracts
    const weth = await ethers.getContractAt("MockERC20", WETH_ADDRESS);
    const usdc = await ethers.getContractAt("MockERC20", USDC_ADDRESS);
    const pair = await ethers.getContractAt("UniswapV2Pair", PAIR_ADDRESS);
    
    // Check balances
    const wethBalance = await weth.balanceOf(deployer.address);
    const usdcBalance = await usdc.balanceOf(deployer.address);
    
    console.log("WETH Balance:", ethers.formatEther(wethBalance));
    console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6));
    
    // Mint more tokens if needed
    if (wethBalance < ethers.parseEther("100")) {
      console.log("Minting WETH...");
      await weth.mint(deployer.address, ethers.parseEther("1000"));
    }
    
    if (usdcBalance < ethers.parseUnits("100000", 6)) {
      console.log("Minting USDC...");
      await usdc.mint(deployer.address, ethers.parseUnits("1000000", 6));
    }
    
    // Transfer tokens directly to pair
    console.log("Transferring tokens to pair...");
    await weth.transfer(PAIR_ADDRESS, ethers.parseEther("100"));
    await usdc.transfer(PAIR_ADDRESS, ethers.parseUnits("100000", 6));
    
    // Call sync to update reserves
    console.log("Syncing reserves...");
    await pair.sync();
    
    // Check final reserves
    const [reserve0, reserve1] = await pair.getReserves();
    console.log("Final Reserve 0 (WETH):", ethers.formatEther(reserve0));
    console.log("Final Reserve 1 (USDC):", ethers.formatUnits(reserve1, 6));
    
    console.log(" Liquidity added directly!");
    
  } catch (error) {
    console.error("Error:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 