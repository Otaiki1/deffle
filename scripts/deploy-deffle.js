const { network } = require("hardhat");

module.exports = async function({ getNamedAccounts, deployments }) {

  const{ deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();

  const deffle = await deploy("Deffle", {
    from: deployer,
    args: [],
    logs: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  })

}