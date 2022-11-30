const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const{ expect } = require("chai")
!developmentChains.includes(network.name) 
    ? describe.skip
    : describe("Raffle Unit Tests", async() => {

        let raffle, vrfCoordinatorV2Mock, addr1, addr2

        beforeEach(async() => {
            const { deployer, player} = await getNamedAccounts();
            await deployments.fixture(["all"]);
            raffle = await ethers.getContract("Deffle", deployer)
            vrfCoordinatorV2Mock  = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
            addr1 = deployer
            addr2 = player
        })

        describe("Constructor", async() => {
            it("Initializes the state variables correctly", async() => {
                const raffleOwner  =await raffle.owner();
                const raffleCreationFee = await raffle.creationFee()
                const raffleFeePercent = await raffle.feePercent()

                expect(raffleOwner).to.eq(addr1);
                expect(raffleCreationFee).to.eq(ethers.utils.parseEther("0.1"));
                expect(raffleFeePercent.toString()).to.eq("10");
            })
        })
    })
