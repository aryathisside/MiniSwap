const { ethers } = require("hardhat");

async function main() {
  console.log("Adding balanced liquidity to WETH/USDC pair...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  
  // Deployed addresses from Sepolia
  const WETH_ADDRESS = "0xf6DF679a989765b23af413e0998d8652D1A9Ee67";
  const USDC_ADDRESS = "0x0587f8F70D6b5f28309078d0de732Fb690c6D4Be";
  const ROUTER_ADDRESS = "0xd28B40E1F60de2e38aB149267C94B51Ede5CF7Ef";
  
  try {
    // Get token contracts
    const weth = await ethers.getContractAt("MockERC20", WETH_ADDRESS);
    const usdc = await ethers.getContractAt("MockERC20", USDC_ADDRESS);
    const router = await ethers.getContractAt("UniswapV2Router", ROUTER_ADDRESS);
    
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
    
    // Approve router to spend tokens
    console.log("Approving tokens...");
    await weth.approve(ROUTER_ADDRESS, ethers.parseEther("1000"));
    await usdc.approve(ROUTER_ADDRESS, ethers.parseUnits("1000000", 6));
    
    // Add liquidity with very low minimums to ensure it goes through
    console.log("Adding liquidity...");
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
    
    const tx = await router.addLiquidity(
      WETH_ADDRESS,
      USDC_ADDRESS,
      ethers.parseEther("50"), // 50 WETH
      ethers.parseUnits("50000", 6), // 50,000 USDC
      ethers.parseEther("1"), // min WETH (very low)
      ethers.parseUnits("1000", 6), // min USDC (very low)
      deployer.address,
      deadline
    );
    
    console.log("Liquidity transaction hash:", tx.hash);
    await tx.wait();
    console.log(" Balanced liquidity added successfully!");
    
  } catch (error) {
    console.error("Error adding liquidity:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 