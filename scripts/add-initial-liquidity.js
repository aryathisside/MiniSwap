const { ethers } = require("hardhat");

async function main() {
  console.log("Adding initial liquidity to WETH/USDC pair...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  
  // Deployed addresses from Sepolia
  const WETH_ADDRESS = "0xf6DF679a989765b23af413e0998d8652D1A9Ee67";
  const USDC_ADDRESS = "0x0587f8F70D6b5f28309078d0de732Fb690c6D4Be";
  const FACTORY_ADDRESS = "0xbb3B620709055F83E9D502E7f118940ef61ec46e";
  const ROUTER_ADDRESS = "0xd28B40E1F60de2e38aB149267C94B51Ede5CF7Ef";
  const ADAPTER_ADDRESS = "0x9A74347d678B56249146F94A34970216b3f00c48";
  const PAIR_ADDRESS = "0xA48bA2Ff1cC03243fdaf4aF0c5664b8Ce17f3471";
  
  try {
    // Get token contracts
    const weth = await ethers.getContractAt("MockERC20", WETH_ADDRESS);
    const usdc = await ethers.getContractAt("MockERC20", USDC_ADDRESS);
    
    // Check balances
    const wethBalance = await weth.balanceOf(deployer.address);
    const usdcBalance = await usdc.balanceOf(deployer.address);
    
    console.log("WETH Balance:", ethers.formatEther(wethBalance));
    console.log("USDC Balance:", ethers.formatUnits(usdcBalance, 6));
    
    // Mint more tokens if needed
    if (wethBalance < ethers.parseEther("10")) {
      console.log("Minting WETH...");
      await weth.mint(deployer.address, ethers.parseEther("100"));
    }
    
    if (usdcBalance < ethers.parseUnits("10000", 6)) {
      console.log("Minting USDC...");
      await usdc.mint(deployer.address, ethers.parseUnits("1000000", 6));
    }
    
    // Get router contract
    const router = await ethers.getContractAt("UniswapV2Router", ROUTER_ADDRESS);
    
    // Approve router to spend tokens
    console.log("Approving tokens...");
    await weth.approve(ROUTER_ADDRESS, ethers.parseEther("100"));
    await usdc.approve(ROUTER_ADDRESS, ethers.parseUnits("1000000", 6));
    
    // Add liquidity
    console.log("Adding liquidity...");
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
    
    const tx = await router.addLiquidity(
      WETH_ADDRESS,
      USDC_ADDRESS,
      ethers.parseEther("10"), // 10 WETH
      ethers.parseUnits("10000", 6), // 10,000 USDC
      ethers.parseEther("9"), // min WETH
      ethers.parseUnits("9000", 6), // min USDC
      deployer.address,
      deadline
    );
    
    console.log("Liquidity transaction hash:", tx.hash);
    await tx.wait();
    console.log(" Liquidity added successfully!");
    
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