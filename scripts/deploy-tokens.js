const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying complete Uniswap V2 infrastructure to Sepolia...");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  // Deploy WETH token
  console.log("\nDeploying WETH token...");
  const MockERC20 = await ethers.getContractFactory("MockERC20");
  const weth = await MockERC20.deploy("Wrapped Ether", "WETH", 18);
  await weth.waitForDeployment();
  const wethAddress = await weth.getAddress();
  console.log("WETH deployed to:", wethAddress);

  // Deploy USDC token
  console.log("\nDeploying USDC token...");
  const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("USDC deployed to:", usdcAddress);

  // Deploy Uniswap V2 Factory
  console.log("\nDeploying Uniswap V2 Factory...");
  const UniswapV2Factory = await ethers.getContractFactory("UniswapV2Factory");
  const factory = await UniswapV2Factory.deploy(deployer.address);
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("Factory deployed to:", factoryAddress);

  // Deploy Uniswap V2 Router
  console.log("\nDeploying Uniswap V2 Router...");
  const UniswapV2Router = await ethers.getContractFactory("UniswapV2Router");
  const router = await UniswapV2Router.deploy(factoryAddress, wethAddress);
  await router.waitForDeployment();
  const routerAddress = await router.getAddress();
  console.log("Router deployed to:", routerAddress);

  // Deploy UniswapV2Adapter
  console.log("\nDeploying UniswapV2Adapter...");
  const UniswapV2Adapter = await ethers.getContractFactory("UniswapV2Adapter");
  const adapter = await UniswapV2Adapter.deploy(routerAddress);
  await adapter.waitForDeployment();
  const adapterAddress = await adapter.getAddress();
  console.log("Adapter deployed to:", adapterAddress);

  // Mint some tokens to deployer for testing
  console.log("\nMinting test tokens...");
  await weth.mint(deployer.address, ethers.parseEther("1000")); // 1000 WETH
  await usdc.mint(deployer.address, ethers.parseUnits("10000", 6)); // 10000 USDC
  console.log("✓ Minted 1000 WETH and 10000 USDC to deployer");

  // Create WETH/USDC pair
  console.log("\nCreating WETH/USDC pair...");
  const createPairTx = await factory.createPair(wethAddress, usdcAddress);
  await createPairTx.wait();
  const pairAddress = await factory.getPair(wethAddress, usdcAddress);
  console.log("Pair created at:", pairAddress);

  // Verify the deployment
  console.log("\nVerifying deployment...");
  const routerCheck = await adapter.getRouterAddress();
  const factoryCheck = await adapter.getFactoryAddress();
  
  console.log("Router address verified:", routerCheck);
  console.log("Factory address verified:", factoryCheck);

  console.log("\nDeployment successful!");
  console.log("Network: Sepolia");
  console.log("\nContract Addresses:");
  console.log("WETH:", wethAddress);
  console.log("USDC:", usdcAddress);
  console.log("Factory:", factoryAddress);
  console.log("Router:", routerAddress);
  console.log("Adapter:", adapterAddress);
  console.log("WETH/USDC Pair:", pairAddress);
  
  return {
    wethAddress: wethAddress,
    usdcAddress: usdcAddress,
    factoryAddress: factoryAddress,
    routerAddress: routerAddress,
    adapterAddress: adapterAddress,
    pairAddress: pairAddress,
    network: "sepolia"
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 