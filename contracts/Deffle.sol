//SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

error Error__CreateRaffle();
error Error__EnterRaffle();
error Error__UpkeepNotTrue();
error Error__RafflePaymentFailed();
error Error__NotOwner();
contract Deffle is VRFConsumerBaseV2{

    event Deffle__RaffleCreated(uint raffleId, address indexed raffleOwner);
    event RequestedRaffleWinner(uint256 indexed requestId);
    event Deffle__WinnerPicked(uint raffleId, address indexed raffleWinner);
    event Deffle__EarningsWithdrawn(uint indexed _deffleEarnings);

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
        uint256 balance;
        address payable raffleWinner;
    }

    //a mapping of id to Raffles
    mapping(uint256 => Raffle) public idToRaffle;
    //an array of all ids
    uint256[] public idList;

    uint256 id;
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

    constructor(uint256 _creationFee,
        address vrfCoordinatorV2,
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
        if(msg.value < creationFee){
            revert Error__CreateRaffle();
        }

        //update deffle earnings/creation fee balance
        deffleEarnings += msg.value;

        //Update the mapping with inputted data
        id++;
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
         Raffle memory currentRaffle = idToRaffle[raffleId];
        if((raffleId > 0) ||
         (currentRaffle.raffleState == RaffleState.Open)||
         (msg.value >= currentRaffle.entranceFee)||
         (currentRaffle.deadline > block.timestamp)||
         (currentRaffle.participants.length <= currentRaffle.maxTickets)||
         (keccak256(currentRaffle.passCode)  != keccak256(_passCode))
        ){
            revert Error__EnterRaffle();
        }

        
        //update the array of participants
        idToRaffle[raffleId].participants.push(payable(msg.sender));
        idToRaffle[raffleId].balance += msg.value;
    }

    function checkUpkeep(bytes memory /*checkdata */)
    public view returns(
        bool upkeepNeeded,
        bytes memory performData 
    ){
        uint8 i;
        for(i = 0; i < idList.length; i++){
            Raffle memory currentRaffle = idToRaffle[i];
            bool isOpen = RaffleState.Open == currentRaffle.raffleState;
            bool timePassed = block.timestamp > currentRaffle.deadline;
            bool hasBalance  = currentRaffle.balance > 0;
            bool hasPlayers = currentRaffle.participants.length > 0;
            
            bool _upkeepNeeded = (isOpen && timePassed && hasBalance && hasPlayers);
            if(_upkeepNeeded && i > 0){
                upkeepNeeded = _upkeepNeeded;
                performData = abi.encode(i);
                break;
            }
        
        }   
        
    }

    function performUpkeep(bytes calldata /* performData*/ ) external {

        (bool upkeepNeeded, bytes memory idInBytes) = checkUpkeep("");
        uint8 idConverted = abi.decode(idInBytes,(uint8));
        if(!upkeepNeeded){
            revert Error__UpkeepNotTrue();
        }

        currentId = idConverted;
        Raffle memory currentRaffle = idToRaffle[idConverted];

        currentRaffle.raffleState = RaffleState.Calculating;
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

        Raffle memory currentRaffle = idToRaffle[currentId];

        uint256 indexOfWinner = randomWords[0] % currentRaffle.participants.length;
        address payable _raffleWinner =  currentRaffle.participants[indexOfWinner];

        //update state variables
        currentRaffle.raffleWinner = _raffleWinner;
        currentRaffle.raffleState = RaffleState.Closed;
        //calculate how much to pay winner;
        //calculate how much goes to owner of raffle
        (uint winnersPay, uint ownersPay) = getPaymentAmount(currentRaffle.balance, feePercent);
        //Pay winners and owner
        (bool success, ) = _raffleWinner.call{value: winnersPay}("");
        (bool success2, ) = currentRaffle.owner.call{value: ownersPay}("");
        //check
        if(!success && !success2){
            revert Error__RafflePaymentFailed();
        }
        emit Deffle__WinnerPicked(currentId, _raffleWinner);
        
    }

    function getPaymentAmount(uint _balance, uint _feePercent) pure public returns(uint pay, uint charge){
        uint totalAmount = (_balance * (100 + _feePercent)/100);
        charge = totalAmount - _balance;
        pay = _balance - charge; 
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

}