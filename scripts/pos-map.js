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
const ERC20bytecode = require("../artifacts/POSChildERC20.json").bytecode;
const ERC20Abi = require("../artifacts/POSChildERC20.json").abi;
let ERC20Contract = new child_web3.eth.Contract(ERC20Abi);
const ERC721bytecode = require("../artifacts/POSChildERC721.json").bytecode;
const ERC721Abi = require("../artifacts/POSChildERC721.json").abi;
let ERC721Contract = new child_web3.eth.Contract(ERC721Abi);

// add pvt for owner account
const pvtKey = config.pos_pvtkey;
child_web3.eth.accounts.wallet.add(pvtKey);
root_web3.eth.accounts.wallet.add(pvtKey);

// deploy on child
async function deployERC20(token) {
  console.log("deploying ERC20");
  let ERC20 = await ERC20Contract.deploy({
    data: ERC20bytecode,
    arguments: [token.name, token.symbol, token.decimals],
  }).send({
    from: child_web3.eth.accounts.wallet[0].address,
    gas: 7000000,
  });

  console.log("deployed", ERC20.options.address);

  const DEPOSITOR_ROLE = await ERC20.methods.DEPOSITOR_ROLE().call();

  console.log("granting depositor role to ChildChainManager ...");
  await ERC20.methods.grantRole(DEPOSITOR_ROLE, childChainManagerAddress).send({
    from: child_web3.eth.accounts.wallet[0].address,
    gas: 500000,
  });
  console.log("granted");

  return ERC20.options.address;
}

// deploy on child
async function deployERC721(token) {
  console.log("deploying ERC721");
  let ERC721 = await ERC721Contract.deploy({
    data: ERC721bytecode,
    arguments: [token.name, token.symbol],
  }).send({
    from: child_web3.eth.accounts.wallet[0].address,
    gas: 7000000,
  });

  console.log("deployed", ERC721.options.address);

  const DEPOSITOR_ROLE = await ERC721.methods.DEPOSITOR_ROLE().call();

  console.log("granting depositor role to ChildChainManager ...");
  await ERC721.methods
    .grantRole(DEPOSITOR_ROLE, childChainManagerAddress)
    .send({
      from: child_web3.eth.accounts.wallet[0].address,
      gas: 500000,
    });
  console.log("granted");

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
}

async function map() {
  // const ERC20Token = {
  //   root: "0x776dFAfFC876b0f67b78C4776d93b55BE975a549",
  //   name: "TEST Token",
  //   symbol: "TEST",
  //   decimals: 18,
  //   type: "ERC20",
  // };
  const ERC721Token = {
    root: "0x5a08d01e07714146747950CE07BB0f741445D1b8",
    name: "TEST Token",
    symbol: "TEST",
    type: "ERC721",
  };

  // let ERC20 = await deployERC20(ERC20Token);
  // ERC20Token["child"] = ERC20;
  // await mapOnRoot(ERC20Token);
  // await displayInfo(ERC20Token);
  let ERC721 = await deployERC721(ERC721Token);
  ERC721Token["child"] = ERC721;
  await mapOnRoot(ERC721Token);
  await displayInfo(ERC721Token);
}

map();
