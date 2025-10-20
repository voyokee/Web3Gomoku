// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import "../interfaces/IUserVault.sol";

/**
 * @title MockUserVault
 * @notice 用于测试的 UserVaultSystem 简化版本
 * @dev 实现与真实 UserVaultSystem 一致的接口语义：
 *      - 用户通过 pushToPool 将资金存入公共池
 *      - 游戏合约（白名单）通过 scoopFromPool 从公共池划转资金给用户
 */
contract MockUserVault is IUserVault {
    address public owner;
    uint256 public gamePoolBalance; // 公共池余额
    
    mapping(address => uint256) public userBalances; // 用户个人余额
    mapping(address => bool) public whitelist; // 白名单：允许调用 scoopFromPool 的合约地址
    mapping(address => bool) public registeredUsers; // 已注册用户

    event PushedToPool(address indexed user, uint256 amount);
    event ScoopedFromPool(address indexed to, uint256 amount);
    event WhitelistAdded(address indexed account);
    event UserRegistered(address indexed user);

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwnerOrWhitelist() {
        require(msg.sender == owner || whitelist[msg.sender], "Not owner or whitelist");
        _;
    }

    // ==================== 测试辅助函数 ====================
    
    /**
     * @notice 为测试账户铸造余额（模拟 deposit）
     */
    function mint(address to, uint256 amount) external {
        registeredUsers[to] = true;
        userBalances[to] += amount;
    }

    /**
     * @notice 为测试账户注册（模拟 registerUser）
     */
    function registerUser(address user) external {
        registeredUsers[user] = true;
        emit UserRegistered(user);
    }

    /**
     * @notice 添加白名单（模拟 owner 操作）
     */
    function addToWhitelist(address account) external {
        require(msg.sender == owner, "Only owner");
        whitelist[account] = true;
        emit WhitelistAdded(account);
    }

    // ==================== IUserVault 接口实现 ====================

    /**
     * @notice 用户将资金从个人余额推入公共池
     * @dev 对应真实系统中用户质押的行为
     */
    function pushToPool(uint256 amount) external override {
        require(registeredUsers[msg.sender], "User not registered");
        require(amount > 0, "Amount must be greater than 0");
        require(userBalances[msg.sender] >= amount, "Insufficient balance");

        userBalances[msg.sender] -= amount;
        gamePoolBalance += amount;

        emit PushedToPool(msg.sender, amount);
    }

    /**
     * @notice 游戏合约从公共池划转资金到用户个人余额
     * @dev 只有白名单合约可调用，对应真实系统中的结算行为
     */
    function scoopFromPool(address to, uint256 amount) external override onlyOwnerOrWhitelist {
        require(registeredUsers[to], "Recipient not registered");
        require(amount > 0, "Amount must be greater than 0");
        require(gamePoolBalance >= amount, "Insufficient pool balance");

        gamePoolBalance -= amount;
        userBalances[to] += amount;

        emit ScoopedFromPool(to, amount);
    }

    /**
     * @notice 检查地址是否为管理员或白名单
     */
    function isAdmin(address account) external view override returns (bool) {
        return account == owner || whitelist[account];
    }
}
