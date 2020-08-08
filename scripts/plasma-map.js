const Web3 = require("web3");
const config = require("../config.json");

const root_provider = new Web3.providers.HttpProvider(config.ROOT_RPC);
const root_web3 = new Web3(root_provider);

const child_provider = new Web3.providers.HttpProvider(config.MATIC_RPC);
const child_web3 = new Web3(child_provider);

// add pvt for owner account
const pvtKey = config.plasma_pvtkey;
child_web3.eth.accounts.wallet.add(pvtKey);
root_web3.eth.accounts.wallet.add(pvtKey);

// registry contract
const registryAbi = require("../artifacts/Registry.json").abi;
const registryAddress = require("../artifacts/Registry.json").address;
const registry = new root_web3.eth.Contract(registryAbi, registryAddress);

// governance contract
const governanceAbi = require("../artifacts/Governance.json").abi;
const governanceAddress = require("../artifacts/Governance.json").address;
const governance = new root_web3.eth.Contract(governanceAbi, governanceAddress);

// child chain contract
const childchainAbi = require("../artifacts/ChildChain.json").abi;
const childchainAddress = require("../artifacts/ChildChain.json").address;
const childchain = new child_web3.eth.Contract(
  childchainAbi,
  childchainAddress
);

async function unmapTokenOnChild(token) {
  let unmap = await childchain.methods
    .mapToken(token.root, config.NULL_ADDRESS, false)
    .send({
      from: child_web3.eth.accounts.wallet[0].address,
      gas: 5000000,
    });

  return unmap;
}

async function deployTokenAndMapOnChild(token) {
  let child = await childchain.methods
    .addToken(
      token.owner,
      token.root,
      token.name,
      token.symbol,
      token.decimals,
      token.isNFT
    )
    .send({
      from: child_web3.eth.accounts.wallet[0].address,
      gas: 5000000,
    });

  let childToken = child.events.OwnershipTransferred.address;

  return childToken;
}

async function checkRootMap(token) {
  let current_child = await registry.methods
    .rootToChildToken(token.root)
    .call();

  console.log("currently mapped token for", token.root, ":", current_child);

  return current_child;
}

async function checkChildMap(token) {
  let current_child = await childchain.methods.tokens(token.root).call();

  console.log("currently mapped token for", token.root, ":", current_child);

  return current_child;
}

async function mapOnRoot(token) {
  let encodeMapping = await registry.methods
    .mapToken(token.root, token.child, token.isNFT)
    .encodeABI();
  let mapped = await governance.methods
    .update(registryAddress, encodeMapping)
    .send({
      from: root_web3.eth.accounts.wallet[0].address,
      gas: 5000000,
    });
  console.log(mapped);
}

async function erc20() {
  const erc20Token = {
    owner: "0xFd71Dc9721d9ddCF0480A582927c3dCd42f3064C",
    root: "0x776dFAfFC876b0f67b78C4776d93b55BE975a549",
    name: "TEST Token",
    symbol: "TEST",
    decimals: 18,
    isNFT: false,
  };
  if ((await checkChildMap(erc20Token)) !== config.NULL_ADDRESS) {
    console.log(await unmapERC20OnChild(erc20Token));
  }
  erc20Token["child"] = await deployERC20AndMapOnChild(erc20Token);
  await mapOnRoot(erc20Token);
  console.log(await checkRootMap(erc20Token));
}

// erc20();

async function erc721() {
  const erc721Token = {
    owner: "0xFd71Dc9721d9ddCF0480A582927c3dCd42f3064C",
    root: "0x776dFAfFC876b0f67b78C4776d93b55BE975a549",
    name: "TEST Token",
    symbol: "TEST",
    decimals: 0,
    isNFT: true,
  };
  if ((await checkChildMap(erc721Token)) !== config.NULL_ADDRESS) {
    console.log(await unmapTokenOnChild(erc721Token));
  }
  erc721Token["child"] = await deployTokenAndMapOnChild(erc721Token);
  await mapOnRoot(erc721Token);
  console.log(await checkRootMap(erc721Token));
}

// erc721();
