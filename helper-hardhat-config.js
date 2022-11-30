const { ethers } = require("hardhat");

const networkConfig = {
    //add config for testNet networks chainId: {name: ,vrfCoordinatorV2: }
    31337:{
        name: "hardhat",
        creationFee: ethers.utils.parseEther("0.1"),
        gasLane: "0xd89b2bf150e3b9e13446986e571fb9cab24b13cea0a43ea20a6049a85cc807cc",//30gwei
        callbackGasLimit: "500000",
        feePercent: "10"
    }
}

const developmentChains = ["hardhat", "localhost"];
module.exports = {
    networkConfig,
    developmentChains,
}