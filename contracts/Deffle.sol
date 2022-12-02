//SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AutomationCompatibleInterface.sol";

// import "hardhat/console.sol";

error Error__CreateRaffle();
error Error__EnterRaffle();
error Error__UpkeepNotTrue();
error Error__RafflePaymentFailed();
error Error__NotOwner();
contract Deffle is VRFConsumerBaseV2, AutomationCompatibleInterface{

    enum RaffleState{
        Open,
        Calculating,
        Closed
    }

    struct Raffle{
        bytes32 raffleData;
        uint256 entranceFee;
        uint256 deadline;
        bytes passCode;
        uint8 maxTickets;
        address payable[] participants;
        address payable owner;
        RaffleState raffleState;
        uint256 raffleBalance;
        address payable raffleWinner;
    }

    //a mapping of id to Raffles
    mapping(uint256 => Raffle) public idToRaffle;
    //an array of all ids
    uint8[] idList;

    uint8 id;
    address payable public owner;
    uint256 public creationFee;
    uint256 public feePercent;
    uint256 public deffleEarnings;

    //creating an instatnce of vrfCoordinator
    VRFCoordinatorV2Interface public immutable i_vrfCoordinator;
    //chainlink variables
    bytes32 public i_gasLane;
    uint64 public i_subscriptionId;
    uint32 public i_callbackGasLimit;

    uint16 public constant REQUEST_CONFIRMATIONS = 3;
    uint32 public constant NUM_WORDS = 1;

    //keep track of raffle requesting randomness
    uint256 currentId;

    event Deffle__RaffleCreated(uint raffleId, address indexed raffleOwner);
    event Deffle__EnterRaffle(uint raffleId, address indexed participant, uint8 indexed totalParticipants);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event Deffle__WinnerPicked(uint raffleId, address indexed raffleWinner);
    event Deffle__EarningsWithdrawn(uint indexed _deffleEarnings);
    constructor(address vrfCoordinatorV2,
        uint256 _creationFee,
        bytes32 gasLane, //keyhash 
        uint64 subscriptionId,
        uint32 callbackGasLimit,
        uint256 _feePercent
    )
    VRFConsumerBaseV2(vrfCoordinatorV2)
    {
        owner = payable(msg.sender);
        creationFee = _creationFee;
        feePercent = _feePercent;
        //chainlinkstuff
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId ;
        i_callbackGasLimit = callbackGasLimit;
    }
    

    function createRaffle(bytes32 _raffleData,
    uint256 _entranceFee,
    uint256 _deadline,
    uint8 _maxTickets,
    bytes memory _passCode ) external payable{
        if(msg.value < creationFee ||
            _deadline < block.timestamp ||
            _maxTickets <= 1 ||
            _entranceFee <= 0){
            revert Error__CreateRaffle();
        }

        //update deffle earnings/creation fee balance
        deffleEarnings += msg.value;

        //Update the mapping with inputted data
        id = id + 1;
        idToRaffle[id].raffleData = _raffleData;
        idToRaffle[id].entranceFee = _entranceFee;
        idToRaffle[id].deadline = _deadline;
        idToRaffle[id].maxTickets = _maxTickets;
        idToRaffle[id].owner = payable(msg.sender);
        idToRaffle[id].raffleState= RaffleState.Open;
        idToRaffle[id].passCode= _passCode;

        //update idlist array
        idList.push(id);

        emit Deffle__RaffleCreated(id, msg.sender); 
        
    }

    function enterRaffle(uint256 raffleId, bytes memory _passCode) external payable{

        if((raffleId == 0) ||
        (idToRaffle[raffleId].raffleState != RaffleState.Open)||
        (msg.value < idToRaffle[raffleId].entranceFee)||
        (idToRaffle[raffleId].deadline < block.timestamp)||
        (idToRaffle[raffleId].participants.length == idToRaffle[raffleId].maxTickets)||
        (keccak256(idToRaffle[raffleId].passCode)  != keccak256(_passCode))||
        (idList.length < raffleId)||
        (msg.sender == idToRaffle[raffleId].owner)
        ){
            revert Error__EnterRaffle();
        }

        
        //update the array of participants
        idToRaffle[raffleId].participants.push(payable(msg.sender));
        idToRaffle[raffleId].raffleBalance += msg.value;

        //get total participants
        uint8 totalParticipants  = getNumberOfPlayers(raffleId);
        //emit enter raffle event
        emit Deffle__EnterRaffle(raffleId, msg.sender, totalParticipants);
    }

    function checkUpkeep(bytes memory /*checkdata */)
    public view override returns(
        bool upkeepNeeded,
        bytes memory performData 
    ){
        upkeepNeeded = false;
        uint8 sureId;
        for (uint256 i = 0; i < getIdList().length && !upkeepNeeded; i++) {
            bool isOpen = RaffleState.Open == getRaffleState(i+1);
            // console.logString("The raffle state is ");
            // console.logUint(uint(getRaffleState(i+1)));
            bool timePassed = block.timestamp > getDeadline(i+1);
            // console.logString("The time passed is ");
            // console.logUint(getDeadline(i+1));
            // console.logUint(block.timestamp);
            bool hasBalance  = getRaffleBalance(i+1) > 0;
            // console.logString("The raffle balance is ");
            // console.logUint(getRaffleBalance(i+1));
            bool hasPlayers = getNumberOfPlayers(i+1) > 0;
            // console.logString("The player amount is ");
            // console.logUint(getNumberOfPlayers(i+1));
            if (isOpen && timePassed && hasBalance && hasPlayers) {
                // console.logString("TURN TRUEEEEE");
                upkeepNeeded = true;
                sureId = uint8(i+1);
            }
        }
        return (upkeepNeeded, abi.encode(sureId));
    }

    function performUpkeep(bytes calldata /* performData*/ ) external override {

        (bool upkeepNeeded, bytes memory idInBytes) = checkUpkeep("0x");
        // console.log("UpKEEP NEEDED", upkeepNeeded);
        // console.log("IDDDDD", idInBytes);
        // uint8 idConverted = 
        if(!upkeepNeeded){
            revert Error__UpkeepNotTrue();
        }

        currentId = abi.decode(idInBytes,(uint8));

        idToRaffle[currentId].raffleState = RaffleState.Calculating;
        //request random number
        uint256 requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId, 
            REQUEST_CONFIRMATIONS, 
            i_callbackGasLimit, 
            NUM_WORDS);
        emit RequestedRaffleWinner(requestId);
        
    }

    function fulfillRandomWords(
        uint256, /*request id*/
        uint256[] memory randomWords
    ) internal override{


        uint256 indexOfWinner = randomWords[0] % idToRaffle[currentId].participants.length;
        address payable _raffleWinner =  idToRaffle[currentId].participants[indexOfWinner];

        //update state variables
        idToRaffle[currentId].raffleWinner = _raffleWinner;
        idToRaffle[currentId].raffleState = RaffleState.Closed;
        //calculate how much to pay winner;
        //calculate how much goes to owner of raffle
        (uint winnersPay, uint ownersPay) = getPaymentAmount(idToRaffle[currentId].raffleBalance, feePercent);
        //Pay winners and owner
        (bool success, ) = _raffleWinner.call{value: winnersPay}("");
        (bool success2, ) = idToRaffle[currentId].owner.call{value: ownersPay}("");
        //check
        if(!success && !success2){
            revert Error__RafflePaymentFailed();
        }
        emit Deffle__WinnerPicked(currentId, _raffleWinner);
        
    }


    function withdrawDeffleEarnings() external {
        if(msg.sender != owner){
            revert Error__NotOwner();
        }
        uint _deffleEarnings = deffleEarnings;
        deffleEarnings = 0;
        (bool success, ) = owner.call{value: _deffleEarnings}("");
        //check
        if(!success){
            revert Error__RafflePaymentFailed();
        }
        emit Deffle__EarningsWithdrawn(_deffleEarnings);

    }

    /** Getter Functions */

    function getRaffleState(uint raffleId) public view returns (RaffleState) {
        return idToRaffle[raffleId].raffleState;
    }

    function getNumWords() public pure returns (uint256) {
        return NUM_WORDS;
    }

    function getRequestConfirmations() public pure returns (uint256) {
        return REQUEST_CONFIRMATIONS;
    }

    function getRaffleWinner(uint raffleId) public view returns (address) {
        return idToRaffle[raffleId].raffleWinner;
    }

    function getPlayers(uint raffleId) public view returns (address payable[] memory) {
        address payable[] storage tempArray = idToRaffle[raffleId].participants;
        return tempArray;
    }

    function getDeadline(uint raffleId) public view returns (uint256) {
        return idToRaffle[raffleId].deadline;
    }


    function getEntranceFee(uint raffleId) public view returns (uint256) {
        return idToRaffle[raffleId].entranceFee;
    }

    function getNumberOfPlayers(uint raffleId) public view returns (uint8) {
        return uint8(idToRaffle[raffleId].participants.length);
    }

    function getMaxPlayers(uint raffleId) public view returns (uint8) {
        return idToRaffle[raffleId].maxTickets;
    }
    function getRaffleBalance(uint raffleId) public view returns (uint) {
        return idToRaffle[raffleId].raffleBalance;
    }
    function getIdList() public view returns (uint8[] memory) {
        return idList;
    }
    function getRaffleOwner(uint raffleId) public view returns (address) {
        return idToRaffle[raffleId].owner;
    }
    //Pure Functions
    function getPaymentAmount(uint _balance, uint _feePercent) pure public returns(uint pay, uint charge){
        uint totalAmount = (_balance * (100 + _feePercent)/100);
        charge = totalAmount - _balance;
        pay = _balance - charge; 
    } 
    
}
