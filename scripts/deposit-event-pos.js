const WebSocket = require("ws");
const Web3 = require("web3");

const ws = new WebSocket("wss://ws-mumbai.matic.today/");
const web3 = new Web3();
const abiCoder = web3.eth.abi;

async function checkDepositStatus(userAccount, rootToken, depositAmount) {
  return new Promise((resolve, reject) => {
    ws.on("open", () => {
      ws.send(
        '{"id": 1, "method": "eth_subscribe", "params": ["newDeposits", {"Contract": "0xb5505a6d998549090530911180f38aC5130101c6"}]}'
      );

      ws.on("message", (msg) => {
        const parsedMsg = JSON.parse(msg);
        if (
          parsedMsg &&
          parsedMsg.params &&
          parsedMsg.params.result &&
          parsedMsg.params.result.Data
        ) {
          const fullData = parsedMsg.params.result.Data;
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
            } = abiCoder.decodeParameters(
              ["address", "address", "bytes"],
              syncData
            );

            // use userAddress, rootTokenAddress to filter deposit
            console.log(
              "PoS deposit",
              "user",
              userAddress,
              "rootToken",
              rootTokenAddress
            );

            // depositData can be further decoded to get amount, tokenId etc. based on token type
            // For ERC20 tokens
            const { 0: amount } = abiCoder.decodeParameters(
              ["uint256"],
              depositData
            );
            console.log("amount", amount);

            if (
              userAddress.toLowerCase() === userAccount.toLowerCase() &&
              rootToken.toLowerCase() === rootTokenAddress.toLowerCase() &&
              depositAmount === amount
            ) {
              resolve(true);
            }
          }
        }
      });

      ws.on("error", () => {
        reject(false);
      });

      ws.on("close", () => {
        reject(false);
      });
    });
  });
}

checkDepositStatus(
  "0xFd71Dc9721d9ddCF0480A582927c3dCd42f3064C",
  "0x655F2166b0709cd575202630952D71E2bB0d61Af",
  "10000000000000000000"
)
  .then((res) => {
    console.log(res);
  })
  .catch((err) => {
    console.log(err);
  });
