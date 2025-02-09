// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.28;

interface IERC20 {
    function name() external view returns (string memory); 
    function symbol() external view returns (string memory); 
    function decimals() external view returns (uint8); 
    function totalSupply() external view returns (uint256);
    function balanceOf(address _owner) external view returns (uint256 balance);
    function transfer(address _to, uint256 _value) external returns (bool success);
    function transferFrom(address _from, address _to, uint256 _value) external returns (bool success);
    function approve(address, uint256 _value) external returns (bool success);
    function allowance(address _owner, address _spender) external view returns (uint256 remaining);
}

contract PiggyBank2 {
    uint256 public targetAmount;
    mapping(address => uint256) public contributions;
    uint256 public immutable withdrawalDate;
    uint256 public contributorsCount;
    address public manager;
    IERC20 public token;

    event Contributed(address indexed contributor, uint256 amount, uint256 time);
    event Withdrawn(uint256 amount, uint256 time);

    constructor(uint256 _targetAmount, uint256 _withdrawalDate, address _manager, IERC20 _token) {
        require(_withdrawalDate > block.timestamp, "WITHDRAWAL MUST BE IN FUTURE");
        targetAmount = _targetAmount;
        withdrawalDate = _withdrawalDate;
        manager = _manager;
        token = _token;
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
        emit Contributed(msg.sender, _value, block.timestamp);
    }

    function withdrawal() external onlyManager {
        require(block.timestamp >= withdrawalDate, 'NOT YET TIME');
        uint256 _contractBal = token.balanceOf(address(this));
        require(_contractBal >= targetAmount, 'TARGET AMOUNT NOT REACHED');
        require(token.transfer(manager, _contractBal), "Transfer Unsuccessful");
        emit Withdrawn(_contractBal, block.timestamp);
    }
}