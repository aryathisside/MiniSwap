const { ethers } = require("hardhat");

async function main() {
  console.log("DEPLOYING UNISWAP V2 SYSTEM TO SEPOLIA");
  console.log("=====================================");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // Deploy WETH
  console.log("\nDeploying WETH...");
  const WETH = await ethers.getContractFactory("MockERC20");
  const weth = await WETH.deploy("Wrapped Ether", "WETH", 18);
  await weth.waitForDeployment();
  console.log("WETH deployed to:", await weth.getAddress());

  // Deploy USDT
  console.log("\nDeploying USDT...");
  const USDT = await ethers.getContractFactory("MockERC20");
  const usdt = await USDT.deploy("Tether USD", "USDT", 6);
  await usdt.waitForDeployment();
  console.log("USDT deployed to:", await usdt.getAddress());

  // Deploy DAI
  console.log("\nDeploying DAI...");
  const DAI = await ethers.getContractFactory("MockERC20");
  const dai = await DAI.deploy("Dai Stablecoin", "DAI", 18);
  await dai.waitForDeployment();
  console.log("DAI deployed to:", await dai.getAddress());

  // Deploy Factory
  console.log("\nDeploying Factory...");
  const Factory = await ethers.getContractFactory("UniswapV2Factory");
  const factory = await Factory.deploy(deployer.address);
  await factory.waitForDeployment();
  console.log("Factory deployed to:", await factory.getAddress());

  // Deploy Router
  console.log("\nDeploying Router...");
  const Router = await ethers.getContractFactory("UniswapV2Router");
  const router = await Router.deploy(await factory.getAddress(), await weth.getAddress());
  await router.waitForDeployment();
  console.log("Router deployed to:", await router.getAddress());

  // Deploy Adapter
  console.log("\nDeploying Adapter...");
  const Adapter = await ethers.getContractFactory("UniswapV2Adapter");
  const adapter = await Adapter.deploy(await router.getAddress());
  await adapter.waitForDeployment();
  console.log("Adapter deployed to:", await adapter.getAddress());

  // Mint tokens to deployer
  console.log("\nMinting tokens to deployer...");
  await weth.mint(deployer.address, ethers.parseEther("10"));
  await usdt.mint(deployer.address, ethers.parseUnits("20000", 6));
  await dai.mint(deployer.address, ethers.parseEther("20000"));
  console.log("Tokens minted");

  // Create one pair for testing
  console.log("\nCreating WETH/USDT pair...");
  const tx1 = await factory.createPair(await weth.getAddress(), await usdt.getAddress());
  await tx1.wait();
  const wethUsdtPairAddress = await factory.getPair(await weth.getAddress(), await usdt.getAddress());
  console.log("WETH/USDT Pair:", wethUsdtPairAddress);

  if (wethUsdtPairAddress === "0x0000000000000000000000000000000000000000") {
    throw new Error("WETH/USDT pair creation failed");
  }

  // Save addresses to files
  const addresses = {
    WETH: await weth.getAddress(),
    USDT: await usdt.getAddress(),
    DAI: await dai.getAddress(),
    Factory: await factory.getAddress(),
    Router: await router.getAddress(),
    Adapter: await adapter.getAddress(),
    WETHUSDTPair: wethUsdtPairAddress
  };

  console.log("\nSEPOLIA DEPLOYMENT COMPLETE");
  console.log("===========================");
  console.log("Contract Addresses:");
  console.log("WETH:", addresses.WETH);
  console.log("USDT:", addresses.USDT);
  console.log("DAI:", addresses.DAI);
  console.log("Factory:", addresses.Factory);
  console.log("Router:", addresses.Router);
  console.log("Adapter:", addresses.Adapter);
  console.log("WETH/USDT Pair:", addresses.WETHUSDTPair);
  console.log("===========================");

  // Write to file for frontend
  const fs = require('fs');
  fs.writeFileSync('sepolia-addresses.json', JSON.stringify(addresses, null, 2));
  console.log("Addresses saved to sepolia-addresses.json");

  return addresses;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });