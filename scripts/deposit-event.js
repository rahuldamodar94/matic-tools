const WebSocket = require("ws");
const Web3 = require("web3");

const ws = new WebSocket("wss://ws-mumbai.matic.today/");
const web3 = new Web3();
const abiCoder = web3.eth.abi;

const plasmaChildChain = "0x1edd419627ef40736ec4f8ceffde671a30803c5e";
const posChildChainManager = "0xb5505a6d998549090530911180f38ac5130101c6";

ws.on("open", function open() {
  ws.send(
    '{"id": 1, "method": "eth_subscribe", "params": ["newDeposits", {}]}'
  );

  setInterval(() => {
    // ping to keep connection alive
    ws.send('{"id": 1, "type": "ping"}');
  }, 60000);
});

ws.on("message", function incoming(msg) {
  console.log("message received", msg);
  const parsedMsg = JSON.parse(msg);
  if (
    parsedMsg &&
    parsedMsg.params &&
    parsedMsg.params.result &&
    parsedMsg.params.result.Data
  ) {
    var fullData = parsedMsg.params.result.Data;
    const contract = parsedMsg.params.result.Contract;

    switch (contract.toLowerCase()) {
      case plasmaChildChain.toLowerCase():
        plasmaSyncHandler(fullData);
        break;

      case posChildChainManager.toLowerCase():
        posSyncHandler(fullData);
        break;
    }
  }
});

ws.on("close", function close() {
  console.log("closing websocket connection...");
  process.exit(0);
});

const plasmaSyncHandler = (fullData) => {
  const {
    0: userAddress,
    1: rootTokenAddress,
    2: amountOrTokenId,
    3: depositId,
  } = abiCoder.decodeParameters(
    ["address", "address", "uint256", "uint256"],
    fullData
  );

  // use userAddress, rootTokenAddress, amountOrTokenId or depositId to confirm deposit
  console.log(
    "Plasma deposit",
    userAddress,
    rootTokenAddress,
    amountOrTokenId,
    depositId
  );
};

const posSyncHandler = (fullData) => {
  const { 0: syncType, 1: syncData } = abiCoder.decodeParameters(
    ["bytes32", "bytes"],
    fullData
  );

  // check if sync is of deposit type (keccak256("DEPOSIT"))
  const depositType =
    "0x87a7811f4bfedea3d341ad165680ae306b01aaeacc205d227629cf157dd9f821";
  if (syncType.toLowerCase() === depositType.toLowerCase()) {
    const {
      0: userAddress,
      1: rootTokenAddress,
      2: depositData,
    } = abiCoder.decodeParameters(["address", "address", "bytes"], syncData);

    // use userAddress, rootTokenAddress to confirm deposit
    // depositData can be further decoded to get amount, tokenId etc based on token type
    console.log("PoS deposit", userAddress, rootTokenAddress);
  }
};
