const Web3 = require("web3");

// Ethereum provider
const provider = new Web3.providers.WebsocketProvider(
  "wss://ws-mumbai.matic.today"
);

const web3 = new Web3(provider);

async function checkTransfer(contract, fromAddress, toAddress, tokenAmount) {
  return new Promise(async (resolve, reject) => {
    web3.eth.subscribe(
      "logs",
      {
        address: contract,
      },
      async (error, result) => {
        if (error) {
          reject(error);
        }

        if (result) {
          let from = web3.eth.abi.decodeParameters(
            ["address"],
            result.topics[1]
          );

          let to = web3.eth.abi.decodeParameters(["address"], result.topics[2]);

          let amount = web3.eth.abi.decodeParameters(["uint256"], result.data);

          if (
            fromAddress === from["0"] &&
            toAddress === to["0"] &&
            tokenAmount === amount["0"]
          ) {
            resolve(true);
          }
        }
      }
    );
  });
}

// transaction hash of the transaction on matic
checkTransfer(
  "0xfe4f5145f6e09952a5ba9e956ed0c25e3fa4c7f1",
  "0xFd71Dc9721d9ddCF0480A582927c3dCd42f3064C",
  "0x28e9E72DbF7ADee19B5279C23E40a1b0b35C2B90",
  "100000000000000000"
)
  .then((res) => {
    console.log(res);
    provider.disconnect();
  })
  .catch((err) => {
    console.log(err);
  });
