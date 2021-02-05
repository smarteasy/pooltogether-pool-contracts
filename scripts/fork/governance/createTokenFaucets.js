const buidler = require('@nomiclabs/buidler')
const chalk = require("chalk")

function dim() {
  console.log(chalk.dim.call(chalk, ...arguments))
}

function green() {
  console.log(chalk.green.call(chalk, ...arguments))
}

const { ethers, deployments, getNamedAccounts } = buidler

async function getProxy(tx) { 
  const tokenFaucetProxyFactoryDeployment = await deployments.get('TokenFaucetProxyFactory')
  const gnosisSafe = await ethers.provider.getUncheckedSigner('0x029Aa20Dcc15c022b1b61D420aaCf7f179A9C73f')
  const tokenFaucetProxyFactory = await ethers.getContractAt('TokenFaucetProxyFactory', tokenFaucetProxyFactoryDeployment.address, gnosisSafe)
  const createResultReceipt = await ethers.provider.getTransactionReceipt(tx.hash)
  const createResultEvents = createResultReceipt.logs.map(log => { try { return tokenFaucetProxyFactory.interface.parseLog(log) } catch (e) { return null } })
  return createResultEvents[0].args.proxy
}

const pool = require("../../../../governance/deployments/fork/Pool.json").address

async function run() {
  const tokenFaucetProxyFactoryDeployment = await deployments.get('TokenFaucetProxyFactory')
  console.log(" token faucet ", tokenFaucetProxyFactoryDeployment.address)
  console.log("pool address ", pool)
  
  const gnosisSafe = await ethers.provider.getUncheckedSigner('0x029Aa20Dcc15c022b1b61D420aaCf7f179A9C73f')
  const tokenFaucetProxyFactory = await ethers.getContractAt('TokenFaucetProxyFactory', tokenFaucetProxyFactoryDeployment.address, gnosisSafe)

  const poolToken = await ethers.getContractAt('Pool', pool, gnosisSafe)
  // existing maninnet multiple winners addresses
  const daiPrizeStrategy = await ethers.getContractAt('MultipleWinners', '0x178969A87a78597d303C47198c66F68E8be67Dc2', gnosisSafe)
  const usdcPrizeStrategy = await ethers.getContractAt('MultipleWinners', '0x3d9946190907ada8b70381b25c71eb9adf5f9b7b', gnosisSafe)
  const uniPrizeStrategy = await ethers.getContractAt('MultipleWinners', '0xe8726B85236a489a8E84C56c95790d07a368f913', gnosisSafe)

  dim(`Creating dai TokenFaucet...`)
  const daiDripAmount = ethers.utils.parseEther('225000')
  const daiDripRate = daiDripAmount.div(98 * 24 * 3600)
  const daiTicket = await daiPrizeStrategy.ticket()
  const createResultTx = await tokenFaucetProxyFactory.create(pool,daiTicket , daiDripRate)
  dim(`getting Dai TokenFaucet address `)
  const daiTokenFaucet = await getProxy(createResultTx)
  await daiPrizeStrategy.setTokenListener(daiTokenFaucet)
  green(`Created Dai TokenFaucet at ${daiTokenFaucet}!`)
  await poolToken.transfer(daiTokenFaucet, daiDripAmount)
  green(`Transferred ${daiDripAmount} to ${daiTokenFaucet}`)


  dim(`Creating usdc TokenFaucet...`)
  const usdcTokenFaucetTx = await tokenFaucetProxyFactory.create(pool, await usdcPrizeStrategy.ticket(), daiDripRate)
  dim(`Retrieving proxy...`)
  const usdcTokenFaucet = await getProxy(usdcTokenFaucetTx)
  dim(`Setting listener...`)
  await usdcPrizeStrategy.setTokenListener(usdcTokenFaucet)
  green(`Created usdc TokenFaucet at ${usdcTokenFaucet}!`)
  await poolToken.transfer(usdcTokenFaucet, daiDripAmount)
  green(`Transferred ${daiDripAmount} to ${usdcTokenFaucet}`)


  dim(`Creating uni TokenFaucet...`)
  const uniDripAmount = ethers.utils.parseEther('50000')
  const uniDripRate = uniDripAmount.div(98 * 24 * 3600)
  const uniTokenFaucetTx = await tokenFaucetProxyFactory.create(pool, await uniPrizeStrategy.ticket(), uniDripRate)
  const uniTokenFaucet = await getProxy(uniTokenFaucetTx)
  await uniPrizeStrategy.setTokenListener(uniTokenFaucet)
  green(`Created uni TokenFaucet at ${uniTokenFaucet}!`)
  await poolToken.transfer(uniTokenFaucet, uniDripAmount)
  green(`Transferred ${uniDripAmount} to ${uniTokenFaucet}`)

}

run()


// Created Dai TokenFaucet at 0x1A3319e7a6762ba6F6d53325ADB7EFd3016a1043!
// Creating usdc TokenFaucet...
// Retrieving proxy...
// Setting listener...
// Created usdc TokenFaucet at 0x25044283b981bC18Cba44738fA4F97eabfe9362F!
// Creating uni TokenFaucet...
// Created uni TokenFaucet at 0x98e54a80A753130Df8757F01979aF6528300626d!