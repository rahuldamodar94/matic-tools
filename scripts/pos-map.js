const Web3 = require("web3");
const config = require("../config.json");
const root_provider = new Web3.providers.HttpProvider(config.ROOT_RPC);
const root_web3 = new Web3(root_provider);

const child_provider = new Web3.providers.HttpProvider(config.MATIC_RPC);
const child_web3 = new Web3(child_provider);

// @todo: query from contracts
const erc20TokenType =
  "0x8ae85d849167ff996c04040c44924fd364217285e4cad818292c7ac37c0a345b";
const erc721TokenType =
  "0x73ad2146b3d3a286642c794379d750360a2d53a3459a11b3e5d6cc900f55f44a";

const childChainManagerAddress = config.childchain_pos;
const rootChainAddress = require("../artifacts/RootChainManager.json").address;
const rootChainAbi = require("../artifacts/RootChainManager.json").abi;
const rootchain = new root_web3.eth.Contract(rootChainAbi, rootChainAddress);
const ERC20ProxyBytecode = require("../artifacts/UChildERC20Proxy.json")
  .bytecode;
const ERC20ProxyAbi = require("../artifacts/UChildERC20Proxy.json").abi;
let ERC20ProxyContract = new child_web3.eth.Contract(ERC20ProxyAbi);
const ERC20bytecode = require("../artifacts/UChildERC20.json").bytecode;
const ERC20Abi = require("../artifacts/UChildERC20.json").abi;
let ERC20Contract = new child_web3.eth.Contract(ERC20Abi);
const ERC721bytecode = require("../artifacts/POSChildERC721.json").bytecode;
const ERC721Abi = require("../artifacts/POSChildERC721.json").abi;
let ERC721Contract = new child_web3.eth.Contract(ERC721Abi);

// add pvt for owner account
const pvtKey = config.pos_pvtkey;
child_web3.eth.accounts.wallet.add(pvtKey);
root_web3.eth.accounts.wallet.add(pvtKey);

// update erc20 on child
async function updateERC20(token) {
  console.log("updating ERC20");
  let ERC20 = await ERC20Contract.deploy({
    data: ERC20bytecode,
  }).send({
    from: child_web3.eth.accounts.wallet[0].address,
    gas: 7000000,
  });

  let ERC20Upgradable = await new child_web3.eth.Contract(
    ERC20ProxyAbi,
    token.child
  );

  await ERC20Upgradable.methods
    .updateImplementation(ERC20.options.address)
    .send({
      from: root_web3.eth.accounts.wallet[0].address,
      gas: 500000,
    });
}

// deploy erc20 on child
async function deployERC20(token) {
  console.log("deploying ERC20");
  let ERC20 = await ERC20Contract.deploy({
    data: ERC20bytecode,
  }).send({
    from: child_web3.eth.accounts.wallet[0].address,
    gas: 7000000,
  });

  let ERC20Proxy = await ERC20ProxyContract.deploy({
    data: ERC20ProxyBytecode,
    arguments: [ERC20.options.address],
  }).send({
    from: child_web3.eth.accounts.wallet[0].address,
    gas: 7000000,
  });

  let ERC20Upgradable = await new child_web3.eth.Contract(
    ERC20Abi,
    ERC20Proxy.options.address
  );

  await ERC20Upgradable.methods
    .initialize(
      token.name,
      token.symbol,
      token.decimals,
      childChainManagerAddress
    )
    .send({
      from: root_web3.eth.accounts.wallet[0].address,
      gas: 500000,
    });

  return ERC20Proxy.options.address;
}

// deploy erc721 on child
async function deployERC721(token) {
  console.log("deploying ERC721");
  let ERC721 = await ERC721Contract.deploy({
    data: ERC721bytecode,
    arguments: [token.name, token.symbol, childChainManagerAddress],
  }).send({
    from: child_web3.eth.accounts.wallet[0].address,
    gas: 7000000,
  });

  return ERC721.options.address;
}

// map on root
async function mapOnRoot(token) {
  console.log("mapping on root");
  tokenType = token.type === "ERC20" ? erc20TokenType : erc721TokenType;

  let map = await rootchain.methods
    .mapToken(token.root, token.child, tokenType)
    .send({
      from: root_web3.eth.accounts.wallet[0].address,
      gas: 500000,
    });
  console.log("token mapped on root:", map.transactionHash);
}

async function displayInfo(token) {
  console.log("===");
  let child = await rootchain.methods.rootToChildToken(token.root).call();
  console.log("root token:", token.root, ";child token:", child);
  console.log("===");
  return child;
}

async function mapNFT() {
  const ERC721Token = {
    root: "0x776dFAfFC876b0f67b78C4776d93b55BE975a549",
    name: "TEST Token",
    symbol: "TEST",
    type: "ERC721",
  };
  let ERC721 = await deployERC721(ERC721Token);
  ERC721Token["child"] = ERC721;
  await mapOnRoot(ERC721Token);
  await displayInfo(ERC721Token);
}

async function mapToken() {
  const ERC20Token = {
    root: "0xb36D11788C9c7A44635C376e530072F539153D22",
    name: "TEST Token",
    symbol: "TEST",
    decimals: 18,
    type: "ERC20",
  };

  let child = await displayInfo(ERC20Token);

  if (child == config.NULL_ADDRESS) {
    let ERC20 = await deployERC20(ERC20Token);
    ERC20Token["child"] = ERC20;
    await mapOnRoot(ERC20Token);
  } else {
    ERC20Token["child"] = child;
    await updateERC20(ERC20Token);
  }
  await displayInfo(ERC20Token);
}

mapToken();
// mapNFT();
