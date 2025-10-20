const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Gomoku - 公共池资金流模型", function () {
    let gomoku;
    let mockUserVault;
    let owner, player1, player2, other;

    beforeEach(async function () {
        [owner, player1, player2, other] = await ethers.getSigners();

        // 部署 MockUserVault
        const MockUserVault = await ethers.getContractFactory("MockUserVault");
        mockUserVault = await MockUserVault.deploy();
        
        // 部署 Gomoku 合约
        const Gomoku = await ethers.getContractFactory("Gomoku");
        gomoku = await Gomoku.deploy(mockUserVault.target);

        // 关键步骤：将 Gomoku 合约加入白名单（模拟真实部署后 owner 的操作）
        await mockUserVault.addToWhitelist(gomoku.target);

        // 为玩家注册并铸造初始余额（模拟 registerUser + deposit）
        const initialBalance = ethers.parseEther("10");
        await mockUserVault.registerUser(player1.address);
        await mockUserVault.registerUser(player2.address);
        await mockUserVault.mint(player1.address, initialBalance);
        await mockUserVault.mint(player2.address, initialBalance);
    });

    describe("createGame - 创建游戏", function () {
        const stake = ethers.parseEther("1");

        it("应成功创建游戏", async function () {
            // 玩家先将资金推入公共池
            await mockUserVault.connect(player1).pushToPool(stake);

            // 创建游戏
            await expect(gomoku.connect(player1).createGame(stake))
                .to.emit(gomoku, "GameCreated")
                .withArgs(1, player1.address, stake);

            const game = await gomoku.getGameDetails(1);
            expect(game.gameId).to.equal(1);
            expect(game.players[0]).to.equal(player1.address);
            expect(game.stake).to.equal(stake);
            expect(game.status).to.equal(0); // Lobby
            expect(await gomoku.playerCurrentGame(player1.address)).to.equal(1);
        });

        it("应正确将资金转入公共池", async function () {
            const poolBalanceBefore = await mockUserVault.gamePoolBalance();
            const userBalanceBefore = await mockUserVault.userBalances(player1.address);

            await mockUserVault.connect(player1).pushToPool(stake);
            await gomoku.connect(player1).createGame(stake);

            expect(await mockUserVault.gamePoolBalance()).to.equal(poolBalanceBefore + stake);
            expect(await mockUserVault.userBalances(player1.address)).to.equal(userBalanceBefore - stake);
        });

        it("应在 stake 为 0 时失败", async function () {
            await expect(gomoku.connect(player1).createGame(0))
                .to.be.revertedWith("Stake must be greater than 0");
        });

        it("应在玩家已在游戏中时失败", async function () {
            await mockUserVault.connect(player1).pushToPool(stake);
            await gomoku.connect(player1).createGame(stake);
            await expect(gomoku.connect(player1).createGame(stake))
                .to.be.revertedWith("Player is already in a game");
        });
    });

    describe("joinGame - 加入游戏", function () {
        const stake = ethers.parseEther("1");

        beforeEach(async function () {
            // player1 创建游戏
            await mockUserVault.connect(player1).pushToPool(stake);
            await gomoku.connect(player1).createGame(stake);
        });

        it("应允许玩家加入游戏", async function () {
            // player2 将资金推入公共池
            await mockUserVault.connect(player2).pushToPool(stake);

            await expect(gomoku.connect(player2).joinGame(1))
                .to.emit(gomoku, "GameStarted")
                .withArgs(1, player1.address, player2.address);

            const game = await gomoku.getGameDetails(1);
            expect(game.players[1]).to.equal(player2.address);
            expect(game.status).to.equal(1); // InProgress
            expect(game.turn).to.equal(player1.address);
            expect(game.lastMoveTimestamp).to.be.greaterThan(0);
            expect(await gomoku.playerCurrentGame(player2.address)).to.equal(1);
        });

        it("应检查公共池余额是否充足", async function () {
            // player2 只推入部分资金（不足）
            const insufficientAmount = stake / 2n;
            await mockUserVault.connect(player2).pushToPool(insufficientAmount);

            await expect(gomoku.connect(player2).joinGame(1))
                .to.be.revertedWith("Insufficient pool balance for this game");
        });

        it("应在游戏不存在时失败", async function () {
            await expect(gomoku.connect(player2).joinGame(999))
                .to.be.revertedWith("Game does not exist");
        });

        it("应在玩家尝试加入自己的游戏时失败", async function () {
            await expect(gomoku.connect(player1).joinGame(1))
                .to.be.revertedWith("Cannot join your own game");
        });

        it("应在游戏不在 Lobby 状态时失败", async function () {
            await mockUserVault.connect(player2).pushToPool(stake);
            await gomoku.connect(player2).joinGame(1); // 游戏现在是 InProgress
            
            await mockUserVault.connect(other).pushToPool(stake);
            await mockUserVault.registerUser(other.address);
            await expect(gomoku.connect(other).joinGame(1))
                .to.be.revertedWith("Game is not in Lobby state");
        });
    });

    describe("makeMove - 落子与游戏逻辑", function () {
        const stake = ethers.parseEther("1");
        const initialBalance = ethers.parseEther("10");

        beforeEach(async function () {
            // 双方预存资金并开始游戏
            await mockUserVault.connect(player1).pushToPool(stake);
            await gomoku.connect(player1).createGame(stake);
            await mockUserVault.connect(player2).pushToPool(stake);
            await gomoku.connect(player2).joinGame(1);
        });

        it("应允许玩家落子", async function () {
            await expect(gomoku.connect(player1).makeMove(1, 7, 7))
                .to.emit(gomoku, "MoveMade")
                .withArgs(1, player1.address, 7, 7);
            
            const board = await gomoku.getBoard(1);
            expect(board[7][7]).to.equal(1); // Player 1's piece
            const game = await gomoku.getGameDetails(1);
            expect(game.turn).to.equal(player2.address);
            expect(game.lastMoveTimestamp).to.be.greaterThan(0);
        });

        it("应在不是玩家回合时失败", async function () {
            await expect(gomoku.connect(player2).makeMove(1, 7, 7))
                .to.be.revertedWith("Not your turn");
        });

        it("应正确判定胜者（横向五连）", async function () {
            // P1 落子
            await gomoku.connect(player1).makeMove(1, 0, 0); // 轮到 P2
            await gomoku.connect(player2).makeMove(1, 1, 0); // 轮到 P1
            await gomoku.connect(player1).makeMove(1, 0, 1); // 轮到 P2
            await gomoku.connect(player2).makeMove(1, 1, 1); // 轮到 P1
            await gomoku.connect(player1).makeMove(1, 0, 2); // 轮到 P2
            await gomoku.connect(player2).makeMove(1, 1, 2); // 轮到 P1
            await gomoku.connect(player1).makeMove(1, 0, 3); // 轮到 P2
            await gomoku.connect(player2).makeMove(1, 1, 3); // 轮到 P1
            
            // Player 1 完成致胜一击
            await expect(gomoku.connect(player1).makeMove(1, 0, 4))
                .to.emit(gomoku, "GameEnded")
                .withArgs(1, player1.address, player2.address);

            const game = await gomoku.getGameDetails(1);
            expect(game.status).to.equal(2); // Finished
            expect(game.winner).to.equal(player1.address);
            
            // 胜者应获得双倍赌注（从公共池划转到个人余额）
            expect(await mockUserVault.userBalances(player1.address)).to.equal(initialBalance - stake + stake * 2n);
            expect(await mockUserVault.userBalances(player2.address)).to.equal(initialBalance - stake);
            expect(await gomoku.playerCurrentGame(player1.address)).to.equal(0);
            expect(await gomoku.playerCurrentGame(player2.address)).to.equal(0);
        });
        
        it("应正确处理平局", async function () {
            // 手动设置 moveCount 模拟棋盘快满
            await gomoku._setMoveCount(1, 15 * 15 - 1);

            // P1 落最后一子，不构成五连
            await expect(gomoku.connect(player1).makeMove(1, 14, 14))
                .to.emit(gomoku, "GameDrawn")
                .withArgs(1);
            
            const endedGame = await gomoku.getGameDetails(1);
            expect(endedGame.status).to.equal(2); // Finished
            expect(endedGame.winner).to.equal(ethers.ZeroAddress);
            
            // 双方各自取回赌注
            expect(await mockUserVault.userBalances(player1.address)).to.equal(initialBalance);
            expect(await mockUserVault.userBalances(player2.address)).to.equal(initialBalance);
        });
    });

    describe("超时判负功能", function () {
        const stake = ethers.parseEther("1");

        beforeEach(async function () {
            await mockUserVault.connect(player1).pushToPool(stake);
            await gomoku.connect(player1).createGame(stake);
            await mockUserVault.connect(player2).pushToPool(stake);
            await gomoku.connect(player2).joinGame(1);
        });

        it("应允许对手在超时后索赔胜利", async function () {
            // 模拟时间流逝（需要在测试环境中增加 91 秒）
            await ethers.provider.send("evm_increaseTime", [91]);
            await ethers.provider.send("evm_mine");

            // player2 索赔超时胜利（因为轮到 player1 但超时了）
            await expect(gomoku.connect(player2).claimWinByTimeout(1))
                .to.emit(gomoku, "GameEnded")
                .withArgs(1, player2.address, player1.address);

            const game = await gomoku.getGameDetails(1);
            expect(game.winner).to.equal(player2.address);
        });

        it("应在超时未到时拒绝索赔", async function () {
            await expect(gomoku.connect(player2).claimWinByTimeout(1))
                .to.be.revertedWith("Turn timeout not yet reached");
        });
    });

    describe("认输功能", function () {
        const stake = ethers.parseEther("1");

        beforeEach(async function () {
            await mockUserVault.connect(player1).pushToPool(stake);
            await gomoku.connect(player1).createGame(stake);
            await mockUserVault.connect(player2).pushToPool(stake);
            await gomoku.connect(player2).joinGame(1);
        });

        it("应允许玩家认输", async function () {
            await expect(gomoku.connect(player1).forfeit(1))
                .to.emit(gomoku, "GameEnded")
                .withArgs(1, player2.address, player1.address);

            const game = await gomoku.getGameDetails(1);
            expect(game.winner).to.equal(player2.address);
        });
    });

    describe("取消游戏功能", function () {
        const stake = ethers.parseEther("1");

        it("应允许创建者取消 Lobby 状态的游戏", async function () {
            await mockUserVault.connect(player1).pushToPool(stake);
            await gomoku.connect(player1).createGame(stake);

            const userBalanceBefore = await mockUserVault.userBalances(player1.address);
            await gomoku.connect(player1).cancelGame(1);

            const game = await gomoku.getGameDetails(1);
            expect(game.status).to.equal(2); // Finished
            
            // 创建者应取回赌注
            expect(await mockUserVault.userBalances(player1.address)).to.equal(userBalanceBefore + stake);
            expect(await gomoku.playerCurrentGame(player1.address)).to.equal(0);
        });

        it("应在游戏不在 Lobby 状态时拒绝取消", async function () {
            await mockUserVault.connect(player1).pushToPool(stake);
            await gomoku.connect(player1).createGame(stake);
            await mockUserVault.connect(player2).pushToPool(stake);
            await gomoku.connect(player2).joinGame(1);

            await expect(gomoku.connect(player1).cancelGame(1))
                .to.be.revertedWith("Game is not in lobby state");
        });

        it("应在非创建者调用时拒绝", async function () {
            await mockUserVault.connect(player1).pushToPool(stake);
            await gomoku.connect(player1).createGame(stake);

            await expect(gomoku.connect(player2).cancelGame(1))
                .to.be.revertedWith("Only the creator can cancel the game");
        });
    });

    describe("Debug 函数权限控制", function () {
        const stake = ethers.parseEther("1");

        beforeEach(async function () {
            await mockUserVault.connect(player1).pushToPool(stake);
            await gomoku.connect(player1).createGame(stake);
            await mockUserVault.connect(player2).pushToPool(stake);
            await gomoku.connect(player2).joinGame(1);
        });

        it("应只允许 owner 调用 _setMoveCount", async function () {
            await expect(gomoku.connect(player1)._setMoveCount(1, 100))
                .to.be.revertedWith("Only owner can call this function");

            // owner 可以调用
            await gomoku._setMoveCount(1, 100);
            const game = await gomoku.getGameDetails(1);
            expect(game.moveCount).to.equal(100);
        });
    });
});
