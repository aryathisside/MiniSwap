const { ethers } = require("hardhat");

async function main() {
  console.log("Removing existing liquidity and recreating balanced pair...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Using account:", deployer.address);
  
  // Deployed addresses from Sepolia
  const WETH_ADDRESS = "0xf6DF679a989765b23af413e0998d8652D1A9Ee67";
  const USDC_ADDRESS = "0x0587f8F70D6b5f28309078d0de732Fb690c6D4Be";
  const FACTORY_ADDRESS = "0xbb3B620709055F83E9D502E7f118940ef61ec46e";
  const ROUTER_ADDRESS = "0xd28B40E1F60de2e38aB149267C94B51Ede5CF7Ef";
  const PAIR_ADDRESS = "0xA48bA2Ff1cC03243fdaf4aF0c5664b8Ce17f3471";
  
  try {
    // Get contracts
    const weth = await ethers.getContractAt("MockERC20", WETH_ADDRESS);
    const usdc = await ethers.getContractAt("MockERC20", USDC_ADDRESS);
    const factory = await ethers.getContractAt("UniswapV2Factory", FACTORY_ADDRESS);
    const router = await ethers.getContractAt("UniswapV2Router", ROUTER_ADDRESS);
    const pair = await ethers.getContractAt("UniswapV2Pair", PAIR_ADDRESS);
    
    // Check current reserves
    const [reserve0, reserve1] = await pair.getReserves();
    console.log("Current Reserve 0 (WETH):", ethers.formatEther(reserve0));
    console.log("Current Reserve 1 (USDC):", ethers.formatUnits(reserve1, 6));
    
    // Check LP token balance
    const lpBalance = await pair.balanceOf(deployer.address);
    console.log("LP Token Balance:", ethers.formatEther(lpBalance));
    
    if (lpBalance > 0) {
      console.log("Removing existing liquidity...");
      
      // Approve router to burn LP tokens
      await pair.approve(ROUTER_ADDRESS, lpBalance);
      
      const deadline = Math.floor(Date.now() / 1000) + 300;
      const tx = await router.removeLiquidity(
        WETH_ADDRESS,
        USDC_ADDRESS,
        lpBalance,
        0, // min WETH
        0, // min USDC
        deployer.address,
        deadline
      );
      
      console.log("Remove liquidity transaction hash:", tx.hash);
      await tx.wait();
      console.log(" Existing liquidity removed!");
    }
    
    // Mint fresh tokens
    console.log("Minting fresh tokens...");
    await weth.mint(deployer.address, ethers.parseEther("1000"));
    await usdc.mint(deployer.address, ethers.parseUnits("1000000", 6));
    
    // Approve router
    console.log("Approving tokens...");
    await weth.approve(ROUTER_ADDRESS, ethers.parseEther("1000"));
    await usdc.approve(ROUTER_ADDRESS, ethers.parseUnits("1000000", 6));
    
    // Add balanced liquidity
    console.log("Adding balanced liquidity...");
    const deadline2 = Math.floor(Date.now() / 1000) + 300;
    
    const tx2 = await router.addLiquidity(
      WETH_ADDRESS,
      USDC_ADDRESS,
      ethers.parseEther("100"), // 100 WETH
      ethers.parseUnits("100000", 6), // 100,000 USDC
      ethers.parseEther("90"), // min WETH
      ethers.parseUnits("90000", 6), // min USDC
      deployer.address,
      deadline2
    );
    
    console.log("Add liquidity transaction hash:", tx2.hash);
    await tx2.wait();
    console.log(" Balanced liquidity added successfully!");
    
    // Check final reserves
    const [finalReserve0, finalReserve1] = await pair.getReserves();
    console.log("Final Reserve 0 (WETH):", ethers.formatEther(finalReserve0));
    console.log("Final Reserve 1 (USDC):", ethers.formatUnits(finalReserve1, 6));
    
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