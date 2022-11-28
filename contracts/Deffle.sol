//SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

error Error__CreateRaffle();
error Error__EnterRaffle();
contract Deffle{

    event Deffle__RaffleCreated(uint id, address indexed raffleOwner);

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

    constructor(uint256 _creationFee){
        owner = payable(msg.sender);
        creationFee = _creationFee;
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

        require(raffleId > 0);
        require(idToRaffle[raffleId].raffleState == RaffleState.Open);
        require(msg.value >= idToRaffle[raffleId].entranceFee);
        require(idToRaffle[raffleId].deadline > block.timestamp);
        require(idToRaffle[raffleId].participants.length <= idToRaffle[raffleId].maxTickets);
        
        //update the array of participants
        idToRaffle[raffleId].participants.push(payable(msg.sender));
        idToRaffle[raffleId].balance += msg.value;
    }

    
}