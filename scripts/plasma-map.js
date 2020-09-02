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

const ChildTokenProxyBytecode = require("../artifacts/ChildTokenProxy.json").bytecode;
const ChildTokenProxyAbi = require("../artifacts/ChildTokenProxy.json").abi;
let ChildTokenProxyContract = new child_web3.eth.Contract(ChildTokenProxyAbi);
const ChildERC721ProxifiedBytecode = require("../artifacts/ChildERC721Proxified.json").bytecode;
const ChildERC721ProxifiedAbi = require("../artifacts/ChildERC721Proxified.json").abi;
let ChildERC721ProxifiedContract = new child_web3.eth.Contract(ChildERC721ProxifiedAbi);
const ChildERC20ProxifiedBytecode = require("../artifacts/ChildERC20Proxified.json").bytecode;
const ChildERC20ProxifiedAbi = require("../artifacts/ChildERC20Proxified.json").abi;
let ChildERC20ProxifiedContract = new child_web3.eth.Contract(ChildERC20ProxifiedAbi);

async function deployERC20TokenAndMapOnChild(token) {

  let child = await ChildERC20ProxifiedContract.deploy({
    data: ChildERC20ProxifiedBytecode,
  }).send({
    from: child_web3.eth.accounts.wallet[0].address,
    gas: 7000000,
  });

  let proxy = await ChildTokenProxyContract.deploy({
    data: ChildTokenProxyBytecode,
    arguments: [
      child._address,
    ],
  }).send({
    from: child_web3.eth.accounts.wallet[0].address,
    gas: 7000000,
  });

  await child.methods
    .initialize(token.root, token.name, token.symbol, token.decimals)
    .send({
      from: child_web3.eth.accounts.wallet[0].address,
      gas: 500000,
    });

  let childProxy = new child_web3.eth.Contract(ChildERC20ProxifiedAbi, proxy._address);

  await childProxy.methods
    .changeChildChain(config.childchain_plasma)
    .send({
      from: child_web3.eth.accounts.wallet[0].address,
      gas: 500000,
    });

  await childchain.methods
    .mapToken(token.root, proxy._address, token.isNFT)
    .send({
      from: child_web3.eth.accounts.wallet[0].address,
      gas: 500000,
    });

  return proxy._address
}

async function updateERC20Implementation(token) {

  let child = await ChildERC20ProxifiedContract.deploy({
    data: ChildERC20ProxifiedBytecode,
  }).send({
    from: child_web3.eth.accounts.wallet[0].address,
    gas: 7000000,
  });

  await child.methods
    .initialize(token.root, token.name, token.symbol, token.decimals)
    .send({
      from: child_web3.eth.accounts.wallet[0].address,
      gas: 500000,
    });

  let childERC20Proxy = new child_web3.eth.Contract(ChildERC20ProxifiedAbi, token.proxy);

  await childERC20Proxy.methods
    .changeChildChain(config.childchain_plasma)
    .send({
      from: child_web3.eth.accounts.wallet[0].address,
      gas: 500000,
    });

  let childTokenProxy = new child_web3.eth.Contract(ChildTokenProxyAbi, token.proxy);

  await childTokenProxy.methods
    .updateImplementation(child._address)
    .send({
      from: child_web3.eth.accounts.wallet[0].address,
      gas: 500000,
    });

}



async function deployERC721TokenAndMapOnChild(token) {

  let child = await ChildERC721ProxifiedContract.deploy({
    data: ChildERC721ProxifiedBytecode,
  }).send({
    from: child_web3.eth.accounts.wallet[0].address,
    gas: 7000000,
  });

  let proxy = await ChildTokenProxyContract.deploy({
    data: ChildTokenProxyBytecode,
    arguments: [
      child._address,
    ],
  }).send({
    from: child_web3.eth.accounts.wallet[0].address,
    gas: 7000000,
  });

  await child.methods
    .initialize(token.root, token.name, token.symbol)
    .send({
      from: child_web3.eth.accounts.wallet[0].address,
      gas: 500000,
    });

  let childProxy = new child_web3.eth.Contract(ChildERC721ProxifiedAbi, proxy._address);

  await childProxy.methods
    .changeChildChain(config.childchain_plasma)
    .send({
      from: child_web3.eth.accounts.wallet[0].address,
      gas: 500000,
    });

  await childchain.methods
    .mapToken(token.root, proxy._address, token.isNFT)
    .send({
      from: child_web3.eth.accounts.wallet[0].address,
      gas: 500000,
    });

  return proxy._address;
}

async function updateERC721Implementation(token) {

  let child = await ChildERC721ProxifiedContract.deploy({
    data: ChildERC721ProxifiedBytecode,
  }).send({
    from: child_web3.eth.accounts.wallet[0].address,
    gas: 7000000,
  });

  await child.methods
    .initialize(token.root, token.name, token.symbol)
    .send({
      from: child_web3.eth.accounts.wallet[0].address,
      gas: 500000,
    });

  let childERC721Proxy = new child_web3.eth.Contract(ChildERC721ProxifiedAbi, token.proxy);

  await childERC721Proxy.methods
    .changeChildChain(config.childchain_plasma)
    .send({
      from: child_web3.eth.accounts.wallet[0].address,
      gas: 500000,
    });

  let childTokenProxy = new child_web3.eth.Contract(ChildTokenProxyAbi, token.proxy);

  await childTokenProxy.methods
    .updateImplementation(child._address)
    .send({
      from: child_web3.eth.accounts.wallet[0].address,
      gas: 500000,
    });

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
    .mapToken(token.root, token.proxy, token.isNFT)
    .encodeABI();
  await governance.methods
    .update(registryAddress, encodeMapping)
    .send({
      from: root_web3.eth.accounts.wallet[0].address,
      gas: 5000000,
    });
}

async function erc20() {

  const erc20Token = {
    root: "0x776dFAfFC876b0f67b78C4776d93b55BE975a549",
    name: "TEST Token",
    symbol: "TEST",
    decimals: 18,
    isNft: false
  };

  let child = await checkChildMap(erc20Token);
  if ((child) !== config.NULL_ADDRESS) {
    erc20Token["proxy"] = child
    await updateERC20Implementation(erc20Token);
  } else {
    erc20Token["proxy"] = await deployERC20TokenAndMapOnChild(erc20Token);
    await mapOnRoot(erc20Token);
  }

  console.log(await checkChildMap(erc20Token));
  console.log(await checkRootMap(erc20Token));
}

// erc20();

async function erc721() {
  const erc721Token = {
    root: "0x776dFAfFC876b0f67b78C4776d93b55BE975a549",
    name: "TEST Token",
    symbol: "TEST",
    isNft: true
  };

  let child = await checkChildMap(erc721Token);
  if ((child) !== config.NULL_ADDRESS) {
    erc721Token["proxy"] = child
    await updateERC721Implementation(erc721Token);
  } else {
    erc721Token["proxy"] = await deployERC721TokenAndMapOnChild(erc721Token);
    await mapOnRoot(erc721Token);
  }

  console.log(await checkChildMap(erc721Token));
  console.log(await checkRootMap(erc721Token));
}

// erc721();
