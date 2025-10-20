const { ethers } = require("hardhat");

/**
 * 完整部署脚本：UserVaultSystem + Gomoku + 白名单配置
 * 
 * 执行步骤：
 * 1. 部署 UserVaultSystem 合约
 * 2. 部署 Gomoku 合约（使用 UserVaultSystem 地址）
 * 3. 将 Gomoku 合约地址加入 UserVaultSystem 白名单
 * 4. 验证配置
 * 
 * 使用方法：
 * npx hardhat run scripts/deployComplete.js --network <network-name>
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("==================== 开始部署流程 ====================");
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  // ========== 步骤 1: 部署 UserVaultSystem ==========
  console.log("📦 步骤 1/4: 部署 UserVaultSystem 合约...");
  const UserVaultSystemFactory = await ethers.getContractFactory("UserVaultSystem");
  const userVaultSystem = await UserVaultSystemFactory.deploy();
  await userVaultSystem.waitForDeployment();
  const userVaultAddress = await userVaultSystem.getAddress();
  console.log("✅ UserVaultSystem 已部署到:", userVaultAddress);
  console.log("   - Owner:", deployer.address);
  console.log("   - 初始公共池余额:", ethers.formatEther(await userVaultSystem.gamePoolBalance()), "ETH\n");

  // ========== 步骤 2: 部署 Gomoku ==========
  console.log("📦 步骤 2/4: 部署 Gomoku 合约...");
  const GomokuFactory = await ethers.getContractFactory("Gomoku");
  const gomoku = await GomokuFactory.deploy(userVaultAddress);
  await gomoku.waitForDeployment();
  const gomokuAddress = await gomoku.getAddress();
  console.log("✅ Gomoku 已部署到:", gomokuAddress);
  console.log("   - UserVault 引用地址:", await gomoku.userVault());
  console.log("   - Owner:", await gomoku.owner(), "\n");

  // ========== 步骤 3: 将 Gomoku 加入白名单 ==========
  console.log("🔑 步骤 3/4: 将 Gomoku 合约加入 UserVaultSystem 白名单...");
  const tx = await userVaultSystem.addToWhitelist(gomokuAddress);
  await tx.wait();
  console.log("✅ 白名单配置成功");
  console.log("   - 交易哈希:", tx.hash, "\n");

  // ========== 步骤 4: 验证配置 ==========
  console.log("🔍 步骤 4/4: 验证部署与配置...");
  const isWhitelisted = await userVaultSystem.isAdmin(gomokuAddress);
  console.log("   - Gomoku 是否在白名单中:", isWhitelisted ? "✅ 是" : "❌ 否");

  if (!isWhitelisted) {
    console.error("\n❌ 错误：Gomoku 合约未能成功加入白名单！");
    process.exit(1);
  }

  // ========== 部署总结 ==========
  console.log("\n==================== 部署成功 ====================");
  console.log("📝 合约地址总结：");
  console.log("   UserVaultSystem:", userVaultAddress);
  console.log("   Gomoku:         ", gomokuAddress);
  console.log("\n📋 后续步骤：");
  console.log("   1. 保存上述合约地址到配置文件");
  console.log("   2. 前端配置中更新合约地址");
  console.log("   3. 如需验证合约，运行：");
  console.log(`      npx hardhat verify --network <network> ${userVaultAddress}`);
  console.log(`      npx hardhat verify --network <network> ${gomokuAddress} ${userVaultAddress}`);
  console.log("\n🎮 用户使用流程：");
  console.log("   1. 用户调用 UserVaultSystem.registerUser(username, password)");
  console.log("   2. 用户调用 UserVaultSystem.login(password)");
  console.log("   3. 用户调用 UserVaultSystem.deposit() 并附带 ETH");
  console.log("   4. 用户调用 UserVaultSystem.pushToPool(stake) 将资金推入公共池");
  console.log("   5. 用户调用 Gomoku.createGame(stake) 创建游戏");
  console.log("   6. 对手重复步骤 1-4");
  console.log("   7. 对手调用 Gomoku.joinGame(gameId) 加入游戏");
  console.log("==================================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ 部署过程中发生错误：");
    console.error(error);
    process.exit(1);
  });

