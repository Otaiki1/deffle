const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");
const{verify} = require("../utils/verify")

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("30");

module.exports = async function({ getNamedAccounts, deployments }) {

  const{ deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId; 
  let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorMockContract;

  if(developmentChains.includes(network.name)){

      

    vrfCoordinatorMockContract = await ethers.getContract("VRFCoordinatorV2Mock");
    vrfCoordinatorV2Address = vrfCoordinatorMockContract.address
    const transactionResponse = await vrfCoordinatorMockContract.createSubscription();
    const transactionReceipt  = await transactionResponse.wait(1);
    subscriptionId = transactionReceipt.events[0].args.subId
    //fund sibscription
    //usually needs token on a live network
    await vrfCoordinatorMockContract.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT)

  }else{
    vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
  }

  const creationFee =  networkConfig[chainId]["creationFee"];
  const gasLane = networkConfig[chainId]["gasLane"];
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
  const feePercent = networkConfig[chainId]["feePercent"];

  const args = [vrfCoordinatorV2Address, creationFee, gasLane, subscriptionId, callbackGasLimit, feePercent]

  const deffle = await deploy("Deffle", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  })
  if(developmentChains.includes(network.name)){
    await vrfCoordinatorMockContract.addConsumer(subscriptionId, deffle.address);
  }
  log('Consumer is added');
  if(!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY){
    log("verifying....");
    await verify(deffle.address, args)

  }
  log("------------------------------------")
}

module.exports.tags = ["all", "deffle"]