// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

interface IUserVault {
    // 用户向公共池质押资金
    function pushToPool(uint256 amount) external;
    
    // 游戏合约从公共池划转资金给用户（需白名单权限）
    function scoopFromPool(address to, uint256 amount) external;
    
    // 只读接口：查询公共池余额
    function gamePoolBalance() external view returns (uint256);
    
    // 只读接口：检查地址是否为管理员或白名单
    function isAdmin(address account) external view returns (bool);
}
