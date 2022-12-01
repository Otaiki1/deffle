const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const{ expect } = require("chai")

const toBytes = (str) =>  ethers.utils.formatBytes32String(str);
const fromBytes = (byt) => ethers.utils.parseBytes32String(byt)
const toEther = (str) => ethers.utils.parseEther(str);
const fromEther = (eth) => Number(ethers.utils.formatEther(eth));

const FUTURE_TIME = 60 * 20;
!developmentChains.includes(network.name) 
    ? describe.skip
    : describe("Deffle Unit Tests", async() => {

        let deffle, vrfCoordinatorV2Mock, addr1, addr2, accounts, addr3

        const correctStrData = toBytes("This is the right data")
        const correctEntranceFee = toEther("1")
        const correctCreationFee = toEther("0.1")
        const correctPassCode = toBytes("Ot123");
        const wrongPassCode = toBytes("rev123");
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
            addr3 = accounts[2];
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
                await expect( deffle
                    .connect(addr2)
                    .createRaffle(
                        correctStrData,
                        correctEntranceFee,
                        correctDeadline,
                        correctMaxTickets,
                        correctPassCode,
                    {value: correctCreationFee}
                    )
                )
                .to.emit(
                    deffle,
                    "Deffle__RaffleCreated"
                ).withArgs(1, addr2.address);
            })

            it("successfully creates a raffle and update state variables", async() => {

                const deffleEarningsBeforeRaffleCreation = fromEther(await deffle.deffleEarnings());
                
                const txResponse = await deffle.connect(addr2)
                    .createRaffle(
                        correctStrData,
                        correctEntranceFee,
                        correctDeadline,
                        correctMaxTickets,
                        correctPassCode,
                    {value: correctCreationFee}
                    )
                const txReceipt = await txResponse.wait(1);
                const raffleId = (txReceipt.events[0].args.raffleId).toString();

                // console.log("RAFFLE ID____----", raffleId)
                // console.log("deffle brfore____----", deffleEarningsBeforeRaffleCreation)
                const deffleEarningsAfterRaffleCreation = fromEther(await deffle.deffleEarnings());
                // console.log("deffle after ____----", deffleEarningsAfterRaffleCreation)

                //ensure deffle earnings has increased
                console.log("TESTING To ENSURE DEFFLE EARNINGS UPDATED")
                expect(deffleEarningsAfterRaffleCreation).to.be.gt(deffleEarningsBeforeRaffleCreation);
                
                //check raffle struct
                const createdRaffle = await deffle.idToRaffle(raffleId);
                let [strData, entrFee, corrDead, passCde, corrMaxTick, ownerAddr, raffState]  = createdRaffle
                    // console.log(strData)
                console.log("TESTING FOR STRUCT UPDATE")
                expect(strData).to.eq(correctStrData);
                expect(entrFee).to.eq(correctEntranceFee);
                expect(corrDead).to.eq(correctDeadline);
                expect(passCde).to.eq(correctPassCode);
                expect(corrMaxTick).to.eq(Number(correctMaxTickets));
                expect(ownerAddr).to.eq(addr2.address);
                expect(raffState).to.eq(0);

                //Check id list ARRAY
                console.log("TESTING FOR idListArray UPDATE")
                const idListArray = await deffle.getIdList();
                expect(idListArray.length).to.eq(1)

                
                
            })
        })
        describe("Enter a created raffle", async() => {
            let raffleId;
            beforeEach(async() => {
                const txResponse = await deffle.connect(addr2)
                    .createRaffle(
                        correctStrData,
                        correctEntranceFee,
                        correctDeadline,
                        correctMaxTickets,
                        correctPassCode,
                    {value: correctCreationFee}
                    )
                const txReceipt = await txResponse.wait(1);
                raffleId = (txReceipt.events[0].args.raffleId).toString();
            })

            it("reverts when wrong inputs are passed", async() => {
                //Testing for 0 raffleId
                await expect( deffle.connect(addr3).enterRaffle(0, correctPassCode, {value: correctEntranceFee}))
                .to.be.revertedWith("Error__EnterRaffle");
                //...later, test for closed raffle state
                //Testing for insufficient msg.value
                await expect( deffle.connect(addr3).enterRaffle(raffleId, correctPassCode, {value: toEther("0.01")}))
                .to.be.revertedWith("Error__EnterRaffle");
                //Test for past deadline
                //...later test fornumber of participants passed
                //Test for incorrect passCode
                await expect( deffle.connect(addr3).enterRaffle(raffleId, wrongPassCode, {value: toEther("0.01")}))
                .to.be.revertedWith("Error__EnterRaffle");
                //Test for exceedng raffleId
                await expect( deffle.connect(addr3).enterRaffle(3, correctPassCode, {value: toEther("0.01")}))
                .to.be.revertedWith("Error__EnterRaffle");
                //Test to ensure owner cant enter raffle
                await expect( deffle.connect(addr2).enterRaffle(raffleId, correctPassCode, {value: correctEntranceFee}))
                .to.be.revertedWith("Error__EnterRaffle");
            })
        })
    })