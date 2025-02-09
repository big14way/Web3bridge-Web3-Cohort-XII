// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./PiggyNFT.sol"; // Assuming PiggyNFT is in the same directory

contract PiggyBank2 {
    uint256 public targetAmount;
    mapping(address => uint256) public contributions;
    mapping(address => uint256) public contributionCount;
    uint256 public immutable withdrawalDate;
    uint256 public contributorsCount;
    address public manager;
    IERC20 public token;
    PiggyNFT public nft;

    event Contributed(address indexed contributor, uint256 amount, uint256 time);
    event Withdrawn(uint256 amount, uint256 time);
    event NFTMinted(address indexed recipient, uint256 tokenId);

    constructor(uint256 _targetAmount, uint256 _withdrawalDate, address _manager, IERC20 _token, PiggyNFT _nft) {
        require(_withdrawalDate > block.timestamp, "WITHDRAWAL MUST BE IN FUTURE");
        targetAmount = _targetAmount;
        withdrawalDate = _withdrawalDate;
        manager = _manager;
        token = _token;
        nft = _nft;
    }

    modifier onlyManager() {
        require(msg.sender == manager, "YOU WAN THIEF ABI ?");
        _;
    }

    function save(uint256 _value) external {
        require(msg.sender != address(0), 'UNAUTHORIZED ADDRESS');
        require(block.timestamp <= withdrawalDate, 'YOU CAN NO LONGER SAVE');
        require(_value > 0, 'YOU ARE BROKE');
        require(token.transferFrom(msg.sender, address(this), _value), "Transfer Unsuccessful");

        if(contributions[msg.sender] == 0) {
            contributorsCount += 1;
        }
        contributions[msg.sender] += _value;
        contributionCount[msg.sender] += 1;
        emit Contributed(msg.sender, _value, block.timestamp);

        if(contributionCount[msg.sender] > 2) {
            uint256 tokenId = nft.mintNFT(msg.sender, "ipfs://your-nft-uri-here"); // You'd replace this with actual URI
            emit NFTMinted(msg.sender, tokenId);
        }
    }

    function withdrawal() external onlyManager {
        require(block.timestamp >= withdrawalDate, 'NOT YET TIME');
        uint256 _contractBal = token.balanceOf(address(this));
        require(_contractBal >= targetAmount, 'TARGET AMOUNT NOT REACHED');
        require(token.transfer(manager, _contractBal), "Transfer Unsuccessful");
        emit Withdrawn(_contractBal, block.timestamp);
    }
}