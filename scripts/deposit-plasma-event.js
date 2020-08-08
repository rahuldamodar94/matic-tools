const WebSocket = require("ws");
const _ = require("lodash");

const ws = new WebSocket("wss://ws-mumbai.matic.today/");

const filter = {
  user: "0x2AD8DbfDeA25e4960AB5b16c7E48F304698aF1Bc", // paste user address here (optional)
  contract: "0x1121eE4143F7543fC46310186428d987a7778259", // paste token address here (optional)
};

ws.on("open", function open() {
  ws.send(
    '{"id": 1, "method": "eth_subscribe", "params": ["newDeposits", {}]}'
  );
});

ws.on("message", function incoming(data) {
  var txData = _.get(JSON.parse(data), "params.result.Data", "");

  var userAddress = txData.substring(0, 64).replace(/^0+/, "0x");
  var contractAddress = txData.substring(65, 128).replace(/^0+/, "0x");

  if (
    filter &&
    filter.user &&
    filter.user.toLowerCase() === userAddress.toLowerCase() &&
    filter &&
    filter.contract &&
    filter.contract.toLowerCase() === contractAddress.toLowerCase()
  ) {
    console.log("matched both", data); // eslint-disable-line
  } else if (
    filter &&
    filter.user &&
    filter.user.toLowerCase() === userAddress.toLowerCase()
  ) {
    console.log("matched userAddress", data); // eslint-disable-line
  } else if (
    filter &&
    filter.contract &&
    filter.contract.toLowerCase() === contractAddress.toLowerCase()
  ) {
    console.log("matched contractAddress", data); // eslint-disable-line
  } else {
    console.log("data", data); // eslint-disable-line
  }
});

ws.on("close", function close() {
  console.log("closing websocket connection..."); // eslint-disable-line
});
