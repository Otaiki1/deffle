const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const { developmentChains } = require("../../helper-hardhat-config");
const{assert, expect } = require("chai")

const toBytes = (str) =>  ethers.utils.formatBytes32String(str);
const fromBytes = (byt) => ethers.utils.parseBytes32String(byt)
const toEther = (str) => ethers.utils.parseEther(str);
const fromEther = (eth) => Number(ethers.utils.formatEther(eth));
const getCurrentTime  = () => Math.round(Date.now() / 1000);

const FUTURE_TIME = 60 * 60 * 1000;
!developmentChains.includes(network.name) 
    ? describe.skip
    : describe("Deffle Unit Tests", async() => {

        let deffle, vrfCoordinatorV2Mock, addr1, addr2, accounts, addr3, deployer

        const correctStrData = toBytes("This is the right data")
        const correctEntranceFee = toEther("1")
        const correctCreationFee = toEther("0.1")
        const correctPassCode = toBytes("Ot123");
        const wrongPassCode = toBytes("rev123");
        const correctDeadline =  getCurrentTime() + FUTURE_TIME ;
        const wrongDeadline = getCurrentTime() - FUTURE_TIME ;
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

            it("successfully enters a raffle and emits the right events", async()=>{
                await expect( deffle.connect(addr3).enterRaffle(raffleId, correctPassCode, {value: correctEntranceFee}))
                .to.emit(
                    deffle,
                    "Deffle__EnterRaffle"
                ).withArgs(raffleId, addr3.address, 1);
            })

            it("successfully enters a raffle and updates state variables", async() => {

                //checkparticipants before raffle entry
                const participantsBeforeEntry = await deffle.getNumberOfPlayers(raffleId);
                //check raffle balance before entry
                const raffleBalanceBeforeEntry = fromEther((await deffle.getRaffleBalance(raffleId)).toString())
                
                //enter raffle
                await deffle.connect(addr3).enterRaffle(raffleId, correctPassCode, {value: correctEntranceFee});
                await deffle.connect(addr3).enterRaffle(raffleId, correctPassCode, {value: correctEntranceFee});
                await deffle.connect(addr3).enterRaffle(raffleId, correctPassCode, {value: correctEntranceFee});

                const participantsAfterEntry = await deffle.getNumberOfPlayers(raffleId);
                const participantsList = await deffle.getPlayers(raffleId)
                
                const raffleBalanceAfterEntry = fromEther((await deffle.getRaffleBalance(raffleId)).toString())

                expect(participantsAfterEntry).to.be.gt(participantsBeforeEntry)
                expect(raffleBalanceAfterEntry).to.be.gt(raffleBalanceBeforeEntry)

                //check that person who entered raffle is inside the participants array
                expect(participantsList[0]).to.eq(addr3.address)

            })
        })

        describe("checkUpkeep", async () => {
            const increaseTime = async() =>{
                await network.provider.send("evm_increaseTime", [correctDeadline + (FUTURE_TIME)])
                await network.provider.request({ method: "evm_mine", params: [] })
            }

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
            it("returns false if people haven't sent any ETH", async () => {
                await increaseTime();
                const { upkeepNeeded } = await deffle.callStatic.checkUpkeep("0x")
                expect(upkeepNeeded).to.eq(false);
            })
            
            it("returns false if raffle isn't open", async () => {
                await deffle.connect(addr3).enterRaffle(raffleId, correctPassCode, { value: correctEntranceFee })

                
                await increaseTime();

                // const blockNumBefore = await ethers.provider.getBlockNumber();
                // const blockBefore = await ethers.provider.getBlock(blockNumBefore);
                // const timestampBefore = blockBefore.timestamp;
                // console.log(timestampBefore)
                await deffle.performUpkeep("0x") // changes the state to calculating
                    const raffleState = await deffle.getRaffleState(raffleId) // stores the new state
                    const { upkeepNeeded } = await deffle.checkUpkeep("0x");
               

                    console.log(upkeepNeeded) // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                assert.equal(raffleState.toString() == "1", upkeepNeeded == false)
                
            })
            it("returns false if enough time hasn't passed", async () => {
                await deffle.connect(addr3).enterRaffle(raffleId, correctPassCode, { value: correctEntranceFee })
                
                const { upkeepNeeded } = await deffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                expect(upkeepNeeded).to.eq(false)
            })
            it("returns true if enough time has passed, has players, eth, and is open", async () => {
                await deffle.connect(addr3).enterRaffle(raffleId, correctPassCode, { value: correctEntranceFee })
                await network.provider.send("evm_increaseTime", [correctDeadline + 1])
                await network.provider.request({ method: "evm_mine", params: [] })
                const { upkeepNeeded } = await deffle.callStatic.checkUpkeep("0x") // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
                expect(upkeepNeeded).to.eq(true)
            })
        })

        describe("performUpkeep", function () {
            const increaseTime = async() =>{
                await network.provider.send("evm_increaseTime", [correctDeadline + (FUTURE_TIME)])
                await network.provider.request({ method: "evm_mine", params: [] })
            }

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

            it("can only run if checkupkeep is true", async () => {
                await deffle.enterRaffle(raffleId, correctPassCode, { value: correctEntranceFee })
                await increaseTime();
                const tx = await deffle.performUpkeep("0x") 
                assert(tx)
            })
            it("reverts if checkup is false", async () => {
                await expect(deffle.performUpkeep("0x")).to.be.revertedWith( 
                    "Error__UpkeepNotTrue"
                )
            })
            it("updates the raffle state and emits a requestId", async () => {
                
                await deffle.enterRaffle(raffleId, correctPassCode, { value: correctEntranceFee })
                await increaseTime();
                const txResponse = await deffle.performUpkeep("0x") // emits requestId
                const txReceipt = await txResponse.wait(1) // waits 1 block
                const raffleState = await deffle.getRaffleState(raffleId) // updates state
                const requestId = txReceipt.events[1].args.requestId
                expect(requestId.toNumber()).to.be.gt(0)
                expect(raffleState).to.eq(1)//0 = open, 1 : calculating
            })
        })

        describe("fulfillRandomWords", function () {
            const increaseTime = async() =>{
                await network.provider.send("evm_increaseTime", [correctDeadline + (FUTURE_TIME)])
                await network.provider.request({ method: "evm_mine", params: [] })
            }

            let raffleId; 
            beforeEach(async () => {
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
                await deffle.connect(addr3).enterRaffle(raffleId, correctPassCode, { value: correctEntranceFee })
                await increaseTime();
            })

            it("can only be called after performupkeep", async () => {
                await expect(
                    vrfCoordinatorV2Mock.fulfillRandomWords(0, deffle.address) // reverts if not fulfilled
                ).to.be.revertedWith("nonexistent request")
                await expect(
                    vrfCoordinatorV2Mock.fulfillRandomWords(1, deffle.address) // reverts if not fulfilled
                ).to.be.revertedWith("nonexistent request")
            })

            it("updates state variables and make payouts", async()=> {
                
                const raffleBalanceBeforeFulfill = await deffle.getRaffleBalance(raffleId);
                const ownerBalanceBeforeFulfill = await ethers.provider.getBalance(addr2.address);
                const winnerBalanceBeforeFulfill = await ethers.provider.getBalance(addr3.address);
                
                const txResponse1 = await deffle.performUpkeep("0x") // emits requestId
                const txReceipt2 = await txResponse1.wait(1) // waits 1 block
                const requestId = txReceipt2.events[1].args.requestId

                await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, deffle.address) ;

                const raffleBalanceAfterFulfill = await deffle.getRaffleBalance(raffleId);
                const ownerBalanceAfterFulfill = await ethers.provider.getBalance(addr2.address);
                const winnerBalanceAfterFulfill = await ethers.provider.getBalance(addr3.address);
                const raffleState = await deffle.getRaffleState(raffleId) // stores the new state
                const raffleWinner = await deffle.getRaffleWinner(raffleId);

                expect(raffleState).to.eq(2)
                expect(raffleWinner).to.eq(addr3.address)//since he was the only participant , he would be winner
                expect(raffleBalanceBeforeFulfill).to.be.gt(raffleBalanceAfterFulfill)// the balance should have reduced
                expect(ownerBalanceBeforeFulfill).to.be.lt(ownerBalanceAfterFulfill)//balance should have increased
                expect(winnerBalanceAfterFulfill).to.be.gt(winnerBalanceBeforeFulfill)//balance should have increased
            })
            it("emits the right events upon successful fulfill", async()=> {
                
                const raffleBalance = await deffle.getRaffleBalance(raffleId);
                
                const txResponse1 = await deffle.performUpkeep("0x") // emits requestId
                const txReceipt2 = await txResponse1.wait(1) // waits 1 block
                const requestId = txReceipt2.events[1].args.requestId

                await expect(vrfCoordinatorV2Mock.fulfillRandomWords(requestId, deffle.address)).to
                .emit(
                    deffle,
                    "Deffle__WinnerPicked"
                ).withArgs(raffleId, addr3.address, raffleBalance); ;

                
            })
        
        })

        describe("Withdraw Contract earnings", function () {
            const increaseTime = async() =>{
                await network.provider.send("evm_increaseTime", [correctDeadline + (FUTURE_TIME)])
                await network.provider.request({ method: "evm_mine", params: [] })
            }

            let raffleId; 
            // it("doesnt allow owner withdraw empty earnings", async() => {
            //     await expect(deffle.withdrawDeffleEarnings()).to.be.revertedWith(
            //         "Error__ZeroAmount"
            //     )
            // })
            beforeEach(async () => {
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
                await deffle.connect(addr3).enterRaffle(raffleId, correctPassCode, { value: correctEntranceFee })
                await increaseTime();
                await deffle.getRaffleBalance(raffleId);
                
                const txResponse1 = await deffle.performUpkeep("0x") // emits requestId
                const txReceipt2 = await txResponse1.wait(1) // waits 1 block
                const requestId = txReceipt2.events[1].args.requestId

                await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, deffle.address)
            })

            it("only allows owner to wthdraw deffle earnings", async()=> {
                await expect(deffle.connect(addr3).withdrawDeffleEarnings()).to.be.revertedWith(
                    "Error__NotOwner"
                )
            })
            it("Updates state Variables and makes payouts", async()=> {
                const contractBalanceBeforeWithdrawal =  await deffle.deffleEarnings();
                const ownerBalanceBeforeWithdrawal =  await ethers.provider.getBalance(addr1.address)

                await deffle.withdrawDeffleEarnings();
                
                const contractBalanceAfterWithdrawal =  await deffle.deffleEarnings();
                const ownerBalanceAfterWithdrawal =  await ethers.provider.getBalance(addr1.address)
                //they should change
                expect(contractBalanceAfterWithdrawal).to.be.lt(contractBalanceBeforeWithdrawal);
                expect(contractBalanceAfterWithdrawal).to.eq(0);
                expect(ownerBalanceAfterWithdrawal).to.be.gt(ownerBalanceBeforeWithdrawal);

            })
            it("Should emit right events", async()=> {
                const contractBalanceBeforeWithdrawal =  await deffle.deffleEarnings();

                await expect(deffle.withdrawDeffleEarnings()).to.emit(
                    deffle,
                    "Deffle__EarningsWithdrawn"
                ).withArgs(contractBalanceBeforeWithdrawal);
                
              

            })

        
        })
})