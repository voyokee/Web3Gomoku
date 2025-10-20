const { ethers } = require("hardhat");

/**
 * Gomoku 单独部署脚本
 * 
 * ⚠️ 前置条件：
 * 1. UserVaultSystem 合约已部署
 * 2. 您拥有 UserVaultSystem 的 owner 权限
 * 
 * 使用方法：
 * 1. 修改下面的 USER_VAULT_ADDRESS 为真实地址
 * 2. 运行: npx hardhat run scripts/deploy.js --network <network-name>
 * 3. 部署完成后，使用 UserVaultSystem owner 账户调用 addToWhitelist
 */
async function main() {
  // ==================================================================
  // ⚠️ 修改这里: 将此地址替换为您已部署的 UserVaultSystem 合约地址
  const USER_VAULT_ADDRESS = "0x8e5c888197eD3Fc3cc5d3e891741F9B38990Ab68"; 
  // ==================================================================

  if (USER_VAULT_ADDRESS === "0xYourUserVaultSystemContractAddressHere" || 
      USER_VAULT_ADDRESS === "0x8e5c888197eD3Fc3cc5d3e891741F9B38990Ab68") {
    console.error("\n❌ 错误：请在 scripts/deploy.js 文件中设置真实的 UserVaultSystem 合约地址。");
    console.log("💡 提示：如果您还未部署 UserVaultSystem，请先运行:");
    console.log("   npx hardhat run scripts/deployUserVault.js --network <network-name>");
    console.log("\n   或使用完整部署脚本:");
    console.log("   npx hardhat run scripts/deployComplete.js --network <network-name>\n");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("\n==================== 部署 Gomoku 合约 ====================");
  console.log("部署账户:", deployer.address);
  console.log("UserVaultSystem 地址:", USER_VAULT_ADDRESS);
  console.log("正在部署...\n");
  
  const gomokuFactory = await ethers.getContractFactory("Gomoku");
  const gomoku = await gomokuFactory.deploy(USER_VAULT_ADDRESS);
  await gomoku.waitForDeployment();

  const gomokuAddress = await gomoku.getAddress();
  console.log("✅ Gomoku 合约已成功部署到地址:", gomokuAddress);
  console.log("   - Owner:", await gomoku.owner());
  console.log("   - UserVault:", await gomoku.userVault());

  console.log("\n==================== ⚠️ 重要：下一步操作 ====================");
  console.log("🔑 必须完成白名单配置，否则游戏无法结算：");
  console.log("\n   方法1: 使用 Hardhat Console");
  console.log("   ----------------------------------------");
  console.log("   $ npx hardhat console --network <network-name>");
  console.log(`   > const uvs = await ethers.getContractAt("UserVaultSystem", "${USER_VAULT_ADDRESS}")`);
  console.log(`   > await uvs.addToWhitelist("${gomokuAddress}")`);
  console.log("   > await uvs.isAdmin(\"" + gomokuAddress + "\") // 应返回 true");
  console.log("\n   方法2: 使用 Etherscan/区块浏览器");
  console.log("   ----------------------------------------");
  console.log(`   1. 访问 UserVaultSystem 合约 (${USER_VAULT_ADDRESS})`);
  console.log("   2. 使用 owner 账户连接钱包");
  console.log(`   3. 调用 addToWhitelist 函数，参数: ${gomokuAddress}`);
  console.log("   4. 确认交易并等待确认");
  console.log("\n   方法3: 使用自定义脚本");
  console.log("   ----------------------------------------");
  console.log("   创建脚本调用 UserVaultSystem.addToWhitelist()");
  console.log("========================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ 部署失败：");
    console.error(error);
    process.exit(1);
  });
