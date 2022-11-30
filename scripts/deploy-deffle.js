const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");

module.exports = async function({ getNamedAccounts, deployments }) {

  const{ deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId; 
  let vrfCoordinatorV2Address;

  if(developmentChains.includes(network.name)){
    const vrfCoordinatorMockContract = await ethers.getContract("VRFCoordinatorV2Mock")
    vrfCoordinatorV2Address = vrfCoordinatorMockContract.address
  }else{
    vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
  }

  const deffle = await deploy("Deffle", {
    from: deployer,
    args: [],
    logs: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  })

}