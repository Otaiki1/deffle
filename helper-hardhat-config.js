const { ethers } = require("hardhat");

const networkConfig = {
    //add config for testNet networks chainId: {name: ,vrfCoordinatorV2: }
    31337:{
        name: "hardhat",
        creationFee: ethers.utils.parseEther("0.1"),
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",//30gwei
        callbackGasLimit: "500000",
        feePercent: "10"
    },
    80001:{
        name: "mumbai",
        subscriptionId: "2772",
        gasLane: "0x4b09e658ed251bcafeebbc69400383d49f344ace09b9576fe248bb02c003fe9f", // 30 gwei
        keepersUpdateInterval: "30",
        creationFee: ethers.utils.parseEther("0.5"), // 0.01 ETH
        callbackGasLimit: "2500000", // 500,000 gas
        vrfCoordinatorV2: "0x7a1BaC17Ccc5b313516C5E16fb24f7659aA5ebed",
        feePercent: 10,
    }
}

const developmentChains = ["hardhat", "localhost"];
module.exports = {
    networkConfig,
    developmentChains,
}