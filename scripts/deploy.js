const { ethers } = require("hardhat");

async function main() {
  console.log("Deploying UniswapV2Adapter to Sepolia...");

  // Get deployer
  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);
  
  // Uniswap V2 Router address for Sepolia
  const routerAddress = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
  console.log("Using router address:", routerAddress);
  
  // Deploy the contract
  const UniswapV2Adapter = await ethers.getContractFactory("UniswapV2Adapter");
  const adapter = await UniswapV2Adapter.deploy(routerAddress);

  await adapter.waitForDeployment();
  const deployedAddress = await adapter.getAddress();

  console.log("UniswapV2Adapter deployed to:", deployedAddress);
  console.log("Router address:", routerAddress);
  console.log("Factory address:", await adapter.getFactoryAddress());

  // Verify the deployment
  console.log("\nVerifying deployment...");
  const routerCheck = await adapter.getRouterAddress();
  const factoryCheck = await adapter.getFactoryAddress();
  
  console.log("Router address verified:", routerCheck);
  console.log("Factory address verified:", factoryCheck);

  console.log("\nDeployment successful!");
  console.log("Contract address:", deployedAddress);
  console.log("Network: Sepolia");
  
  return {
    contractAddress: deployedAddress,
    routerAddress: routerAddress,
    network: "sepolia"
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 