//SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

error Error__CreateRaffle();
error Error__EnterRaffle();
error Error__UpkeepNotTrue();
contract Deffle is VRFConsumerBaseV2{

    event Deffle__RaffleCreated(uint id, address indexed raffleOwner);
    event RequestedRaffleWinner(uint256 indexed requestId);

    enum RaffleState{
        Open,
        Calculating,
        Closed
    }

    struct Raffle{
        bytes32 raffleData;
        uint256 entranceFee;
        uint256 deadline;
        uint256 startTime;
        uint8 maxTickets;
        address payable[] participants;
        address payable owner;
        RaffleState raffleState;
        uint256 balance;
    }

    //a mapping of id to Raffles
    mapping(uint256 => Raffle) public idToRaffle;
    //an array of all ids
    uint256[] public idList;

    uint256 id;
    address payable public owner;
    uint256 public creationFee;

    //creating an instatnce of vrfCoordinator
    VRFCoordinatorV2Interface public immutable i_vrfCoordinator;
     //chainlink variables
    bytes32 public i_gasLane;
    uint64 public i_subscriptionId;
    uint32 public i_callbackGasLimit;

    uint16 public constant REQUEST_CONFIRMATIONS = 3;
    uint32 public constant NUM_WORDS = 1;

    constructor(uint256 _creationFee,
        address vrfCoordinatorV2,
        bytes32 gasLane, //keyhash 
        uint64 subscriptionId,
        uint32 callbackGasLimit
    )
    VRFConsumerBaseV2(vrfCoordinatorV2)
    {
        owner = payable(msg.sender);
        creationFee = _creationFee;
        //chainlinkstuff
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_gasLane = gasLane;
        i_subscriptionId = subscriptionId ;
        i_callbackGasLimit = callbackGasLimit;
    }
    

    function createRaffle(bytes32 _raffleData,
    uint256 _entranceFee,
    uint256 _deadline,
    uint8 _maxTickets ) external payable{
        if(msg.value < creationFee){
            revert Error__CreateRaffle();
        }
        //Update the mapping with inputted data
        id++;
        idToRaffle[id].raffleData = _raffleData;
        idToRaffle[id].entranceFee = _entranceFee;
        idToRaffle[id].deadline = _deadline;
        idToRaffle[id].startTime = block.timestamp;
        idToRaffle[id].maxTickets = _maxTickets;
        idToRaffle[id].owner = payable(msg.sender);
        idToRaffle[id].raffleState= RaffleState.Open;

        //update idlist array
        idList.push(id);

        emit Deffle__RaffleCreated(id, msg.sender); 
        
    }

    function enterRaffle(uint256 raffleId) external payable{
        if((raffleId > 0) ||
         (idToRaffle[raffleId].raffleState == RaffleState.Open)||
         (msg.value >= idToRaffle[raffleId].entranceFee)||
         (idToRaffle[raffleId].deadline > block.timestamp)||
         (idToRaffle[raffleId].participants.length <= idToRaffle[raffleId].maxTickets)
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
            
            upkeepNeeded = (isOpen && timePassed && hasBalance && hasPlayers);
            return(upkeepNeeded, abi.encode(i));
        }   
    }

    function performUpkeep(bytes calldata /* performData*/ ) external {

        (bool upkeepNeeded, bytes memory idInBytes) = checkUpkeep("");
        uint8 idConverted = abi.decode(idInBytes,(uint8));
        if(!upkeepNeeded){
            revert Error__UpkeepNotTrue();
        }

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


}