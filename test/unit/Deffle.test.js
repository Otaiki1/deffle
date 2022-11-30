const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const{ expect } = require("chai")

const toBytes = (str) =>  ethers.utils.formatBytes32String(str);
const fromBytes = (byt) => ethers.utils.parseBytes32String(byt)
const toEther = (str) => ethers.utils.parseEther(str);
const fromEther = (eth) => ethers.utils.formatEther(eth);

const FUTURE_TIME = 60 * 20;
!developmentChains.includes(network.name) 
    ? describe.skip
    : describe("Deffle Unit Tests", async() => {

        let deffle, vrfCoordinatorV2Mock, addr1, addr2, accounts

        const correctStrData = toBytes("This is the right data")
        const correctEntranceFee = toEther("1")
        const correctCreationFee = toEther("0.1")
        const correctPassCode = toBytes("Ot123");
        const correctDeadline =   Date.now() + FUTURE_TIME;
        const wrongDeadline = Date.now() - FUTURE_TIME
        const correctMaxTickets = "10"

        beforeEach(async() => {
            const { deployer, player} = await getNamedAccounts();
            await deployments.fixture(["all"]);
            deffle = await ethers.getContract("Deffle", deployer)
            vrfCoordinatorV2Mock  = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
           
            accounts = await ethers.getSigners();
            addr1 = accounts[0];
            addr2 = accounts[1];
            
            // console.log("correctStrData_____", correctStrData, " ---=>", typeof correctStrData )
            // console.log("correctEntranceFee_____", correctEntranceFee, " ---=>", typeof correctEntranceFee )
            // console.log("correctCreationFee_____", correctCreationFee, " ---=>", typeof correctCreationFee )
            // console.log("correctPassCode_____", correctPassCode, " ---=>", typeof correctPassCode )
            // console.log("correctDeadline_____", correctDeadline, " ---=>", typeof correctDeadline )
        })

        describe("Constructor", async() => {
            it("Initializes the state variables correctly", async() => {
                const deffleOwner  =await deffle.owner();
                const deffleCreationFee = await deffle.creationFee()
                const deffleFeePercent = await deffle.feePercent()

                expect(deffleOwner).to.eq(addr1.address);
                expect(deffleCreationFee).to.eq(ethers.utils.parseEther("0.1"));
                expect(deffleFeePercent.toString()).to.eq("10");
            })
        })
        
        describe("create raffle", async() => {
            it("reverts when wrong inputs are passed", async() => {
                let wrongTransaction

                console.log("Testing Wrong msg.value..")
                await expect( deffle.connect(addr1).createRaffle(correctStrData,
                     correctEntranceFee,
                     correctDeadline,
                     correctMaxTickets,
                     correctPassCode,
                      {value: toEther("0.01")})).to.be.revertedWith("Error__CreateRaffle");

                console.log("Testing Wrong entranceFee")
                await expect( deffle.connect(addr1).createRaffle(correctStrData,
                     0,
                     correctDeadline,
                     correctMaxTickets,
                     correctPassCode,
                      {value: toEther("0.1")})).to.be.revertedWith("Error__CreateRaffle");

                console.log("Testing Wrong deadline")
                await expect( deffle.connect(addr1).createRaffle(correctStrData,
                     correctEntranceFee,
                     wrongDeadline,
                     correctMaxTickets,
                     correctPassCode,
                      {value: toEther("0.01")})).to.be.revertedWith("Error__CreateRaffle");

                console.log("Testing Wrong max tickets")
                await expect( deffle.connect(addr1).createRaffle(correctStrData,
                     correctEntranceFee,
                     correctDeadline,
                     1,
                     correctPassCode,
                      {value: toEther("0.01")})).to.be.revertedWith("Error__CreateRaffle");
                   
            })
            
            it("successfully creates a raffle and emits the right events", async() =>{
                await expect( deffle.connect(addr2).createRaffle(correctStrData,
                                                                correctEntranceFee,
                                                                correctDeadline,
                                                                correctMaxTickets,
                                                                correctPassCode,
                                                                {value: correctCreationFee}))
                                    .to.emit(
                                                deffle,
                                                "Deffle__RaffleCreated"
                                            ).withArgs(1, addr2.address);

            })
        })
    })