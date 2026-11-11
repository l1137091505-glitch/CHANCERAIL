# CHANCERAIL 部署步骤

1. 在 GitHub 新建空的公开仓库，例如 `chancerail`，不要额外创建 README、License 或 `.gitignore`。
2. 解压 `CHANCERAIL-GITHUB-UPLOAD.zip`，上传解压后的全部内容。
3. 在 Remix 新建 `ChanceRail.sol`，复制 `contracts/src/ChanceRail.sol` 的全部代码。
4. 使用 Solidity `0.8.24` 编译，合约选择 `ChanceRail`。
5. Remix 的 Environment 选择 Browser Extension / MetaMask，钱包切换到 BOT Mainnet：
   - Chain ID：`677`
   - RPC：`https://rpc.botchain.ai`
   - Explorer：`https://scan.botchain.ai`
6. 部署 `ChanceRail`，构造函数没有参数。部署钱包会成为合约 owner，只有它能结束本轮和开启下一轮。
7. 复制完整合约地址。
8. 在 Vercel 导入 GitHub 仓库：
   - Root Directory：`frontend`
   - Framework Preset：`Vite`
9. 在 Environment Variables 添加 Config：

```text
Key: VITE_CHANCERAIL_ADDRESS
Value: 0x完整合约地址
Environment: Production
```

10. 部署 Production。若先前已经部署，保存环境变量后 Redeploy，并不要使用旧 Build Cache。

## 网页交互

- 普通用户：连接钱包 → Enter current draw → 钱包确认免费报名交易，只支付网络 Gas。
- 每个地址每轮只能报名一次。
- 部署者钱包：报名结束后在 Archive 底部点击 Finalize current round，确认后产生演示中奖者。
- 部署者钱包：本轮结束后点击 Start next round 开启下一轮。

该项目只用于免费演示。伪随机算法会受到链上输入影响，不适合真实奖品、赌博、彩票或任何高价值结果。
