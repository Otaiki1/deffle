const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const{ ethers } = require("ethers");


describe("Deffle Test Suite", async () => {

    const MOCK_SUBSCRIPTION_ID = 0;
    const MOCK_LINK = constants.AddressZero;
    const CREATION_FEE = ethers.utils.parseEther("0.5")
    const CALLBACK_GAS_LIMIT = "500000"
    const FEE_PERCENT = 5;

    async function deployDeffleContract(vrfCoordinatorContract) {
        const [owner, addr1, addr2, addr3, addr4] = await ethers.getSigners();
        
        const contractFactory = await ethers.getContractFactory("Deffle");

        const vrfCoordFactory = await ethers.getContractFactory(
        vrfCoordinatorContract
        );
        const mockVrfCoordinator = await vrfCoordFactory.connect(owner).deploy();

        const deffleContract = await contractFactory
        .connect(owner)
        .deploy(CREATION_FEE,
            mockVrfCoordinator.address,
            MOCK_LINK,
            MOCK_SUBSCRIPTION_ID,
            CALLBACK_GAS_LIMIT,
            FEE_PERCENT);
    
        console.log("Deffle contract address deployed successfully___---", deffleContract.address)

        return { deffleContract, owner, addr1, addr2, addr3, addr4,};
    }

    
   

})