require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("dotenv").config();

const POLYGON_MUMBAI_RPC_URL = process.env.POLYGON_MUMBAI_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const REPORT_GAS = process.env.REPORT_GAS;
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;
const AUTO_FUND = process.env.AUTO_FUND;

// set proxy
// const { ProxyAgent, setGlobalDispatcher } = require("undici");
// const proxyAgent = new ProxyAgent('http://127.0.0.1:7890'); // change to yours
// setGlobalDispatcher(proxyAgent);

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
      blockConfirmations: 1,
    },
    mumbai: {
      url: POLYGON_MUMBAI_RPC_URL,
      accounts: [`0x${PRIVATE_KEY}`],
      saveDeployments: true,
      chainId: 80001,
    },
  },
  etherscan: {
    // yarn hardhat verify --network <NETWORK> <CONTRACT_ADDRESS> <CONSTRUCTOR_PARAMETERS>
    apiKey: {
      polygonMumbai: POLYGONSCAN_API_KEY,
    },
    // customChains: [
    //     {
    //         network: "polygonMumbai",
    //         chainId: 80001,
    //         urls: {
    //             apiURL: "https://api-testnet.polygonscan.com/",
    //             browserURL: "https://polygonscan.com/",
    //         },
    //     },
    // ],
  },
  namedAccounts: {
    deployer: {
      default: 0,
    },
    player: {
      default: 1,
    },
  },
  solidity: "0.8.7",
};
