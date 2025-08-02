const { ethers } = require("hardhat");

async function main() {
  console.log("Creating new tokens and balanced pair...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  
  // Existing addresses
  const FACTORY_ADDRESS = "0xbb3B620709055F83E9D502E7f118940ef61ec46e";
  const ROUTER_ADDRESS = "0xd28B40E1F60de2e38aB149267C94B51Ede5CF7Ef";
  
  try {
    // Deploy new tokens
    console.log("Deploying new tokens...");
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    
    const newWETH = await MockERC20.deploy("New Wrapped Ether", "nWETH", 18);
    await newWETH.waitForDeployment();
    const newWETHAddress = await newWETH.getAddress();
    
    const newUSDC = await MockERC20.deploy("New USD Coin", "nUSDC", 6);
    await newUSDC.waitForDeployment();
    const newUSDCAddress = await newUSDC.getAddress();
    
    console.log("New WETH deployed to:", newWETHAddress);
    console.log("New USDC deployed to:", newUSDCAddress);
    
    // Mint tokens to deployer
    console.log("Minting tokens...");
    await newWETH.mint(deployer.address, ethers.parseEther("1000"));
    await newUSDC.mint(deployer.address, ethers.parseUnits("1000000", 6));
    
    // Get factory and router
    const factory = await ethers.getContractAt("UniswapV2Factory", FACTORY_ADDRESS);
    const router = await ethers.getContractAt("UniswapV2Router", ROUTER_ADDRESS);
    
    // Create pair
    console.log("Creating pair...");
    await factory.createPair(newWETHAddress, newUSDCAddress);
    const pairAddress = await factory.getPair(newWETHAddress, newUSDCAddress);
    console.log("New pair created at:", pairAddress);
    
    // Approve router
    console.log("Approving tokens...");
    await newWETH.approve(ROUTER_ADDRESS, ethers.parseEther("1000"));
    await newUSDC.approve(ROUTER_ADDRESS, ethers.parseUnits("1000000", 6));
    
    // Add balanced liquidity
    console.log("Adding balanced liquidity...");
    const deadline = Math.floor(Date.now() / 1000) + 300;
    
    const tx = await router.addLiquidity(
      newWETHAddress,
      newUSDCAddress,
      ethers.parseEther("100"), // 100 nWETH
      ethers.parseUnits("100000", 6), // 100,000 nUSDC
      ethers.parseEther("90"), // min nWETH
      ethers.parseUnits("90000", 6), // min nUSDC
      deployer.address,
      deadline
    );
    
    console.log("Liquidity transaction hash:", tx.hash);
    await tx.wait();
    console.log(" New balanced pair created successfully!");
    
    // Check reserves
    const pair = await ethers.getContractAt("UniswapV2Pair", pairAddress);
    const [reserve0, reserve1] = await pair.getReserves();
    console.log("Final Reserve 0 (nWETH):", ethers.formatEther(reserve0));
    console.log("Final Reserve 1 (nUSDC):", ethers.formatUnits(reserve1, 6));
    
    console.log("\nNew Token Addresses:");
    console.log("nWETH:", newWETHAddress);
    console.log("nUSDC:", newUSDCAddress);
    console.log("Pair:", pairAddress);
    
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