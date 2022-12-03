// we can't have these functions in our `helper-hardhat-config`
// since these use the hardhat library
// and it would be a circular dependency
const { run } = require("hardhat")

// const {
//     networkConfig,
//   } = require("../helper-hardhat-config");
    
//   let chainId = 80001;

//   const vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
//   const subscriptionId = networkConfig[chainId]["subscriptionId"]
//   const creationFee = networkConfig[chainId]["creationFee"];
//   const gasLane = networkConfig[chainId]["gasLane"];
//   const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
//   const feePercent = networkConfig[chainId]["feePercent"];

const verify = async (contractAddress, args) => {
    console.log("Verifying contract...")
    try {
        // const args = [
        //     vrfCoordinatorV2Address,
        //     creationFee,
        //     gasLane,
        //     subscriptionId,
        //     callbackGasLimit,
        //     feePercent,
        //   ]
        await run("verify:verify", {
            address: contractAddress,
            constructorArguments: args,
        })
    } catch (e) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Already verified!")
        } else {
            console.log(e)
        }
    }
}

module.exports = {
    verify,
}