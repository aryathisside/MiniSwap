require("@nomicfoundation/hardhat-ethers");
require('@openzeppelin/hardhat-upgrades');
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      viaIR: true,
      evmVersion: "london",
      optimizer: {
        enabled: true,
        runs: 1,
        details: {
          yulDetails: {
            optimizerSteps: "u",
          },
        },
      }
    }

  },
  networks: {
    localhost: {
      chainId: 1337,
    },
    sepolia: {
      url: process.env.SEPOLIA_URL ,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 11155111,
    },
  },

};
