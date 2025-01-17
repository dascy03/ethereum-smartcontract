const { ethers } = require("hardhat");
const path = require("path");
const { setTimeout } = require("timers/promises");
async function main() {
  const [deployer, user1, user2] = await ethers.getSigners();
  const provider = ethers.getDefaultProvider(
    "https://eth-sepolia.g.alchemy.com/v2/nNbspp-yjKP9GtAcdKi8xcLnBTptR2Zx"
  );
  console.log("Signer account:", await deployer.getAddress());
  console.log("Account balance:", (await deployer.getBalance()).toString());

  const contractName = "CallContract";
  const contractArtifact = require(`../artifacts/contracts/${contractName}.sol/${contractName}.json`);
  const contractABI = contractArtifact.abi;
  const callContract = new ethers.Contract(
    "0x10769E9B46Eb87af28f1566B6aee2FFA38fc6fF3",
    contractABI,
    deployer
  );
  const axlContractName = "AxelarGateway";
  const axlContractArtifact = require(`../artifacts/contracts/axelar/${axlContractName}.sol/${axlContractName}.json`);
  const axlContractABI = axlContractArtifact.abi;
  const axlContract = new ethers.Contract(
    "0x70b9E1B98fb9cDd0221778c1E4d72e7a386D9CCe",
    axlContractABI,
    deployer
  );

  const {
    params,
    commandId,
    sourceChain,
    sourceAddress,
    payloadHash,
    payloadBytes,
  } = prepareTxParams();

  // ApproveContractCall
  const txApproveContractCall = await axlContract.approveContractCall(
    params,
    commandId
  );
  console.log("Transaction hash:", txApproveContractCall.hash);
  await txApproveContractCall.wait();
  console.log("Transaction confirmed");
  // Check if the contract call is approved
  const validateResult = await axlContract.isContractCallApproved(
    commandId,
    sourceChain,
    sourceAddress,
    callContract.address,
    payloadHash
  );
  console.log("Validation result:", validateResult);

  try {
    // Listen to ContractCallExecuted event
    console.log("payload bytes:", payloadBytes);
    const MypayloadHash = ethers.utils.keccak256(payloadBytes);
    console.log("My payload hash:", MypayloadHash);
    console.log("payload hash:", payloadHash);
    console.log("call contract gateway:", await callContract.gateway());

    axlContract.on("ContractCallExecuted", (cmdId) => {
      console.log(
        `ContractCallExecuted event detected for commandId = ${cmdId}`
      );
    });
    // Call execute function
    console.log("Message before execute:", await callContract.message());
    const txExecute = await callContract.execute(
      commandId,
      sourceChain,
      sourceAddress,
      payloadBytes,
      {
        gasLimit: 2000000,
      }
    );
    console.log("Transaction hash:", txExecute.hash);

    // Wait for transaction confirmation
    await txExecute.wait();
    console.log("Transaction confirmed");

    // Log message after execute
    console.log("Message after execute:", await callContract.message());
    axlContract.removeAllListeners("ContractCallExecuted");
    console.log(
      "listener count:",
      axlContract.listenerCount("ContractCallExecuted")
    );
  } catch (error) {
    console.error("Error executing transaction:", error);
  }
  // // Call execute
  // console.log("Message before execute:", await callContract.message());
  // const txExecute = await callContract.execute(
  //   commandId,
  //   sourceChain,
  //   sourceAddress,
  //   payloadBytes
  // );
  // console.log("Transaction hash:", txExecute.hash);
  // await txExecute.wait();
  // console.log("Transaction confirmed");
  // console.log("Message after execute:", await callContract.message());
}

function prepareTxParams() {
  const sourceChain = "Bitcoin";
  const sourceAddress = "0xBitcoinSourceAddress";
  const contractAddress = "0x10769E9B46Eb87af28f1566B6aee2FFA38fc6fF3";
  const payloadHash = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("Hello dascy")
  );
  const payloadBytes = ethers.utils.toUtf8Bytes("Hello dascy");
  const sourceTxHash = ethers.utils.keccak256(
    ethers.utils.toUtf8Bytes("0xBitcoinSourceTxHash")
  );
  const sourceEventIndex = 1; // Example value, use the actual event index
  const params = ethers.utils.defaultAbiCoder.encode(
    ["string", "string", "address", "bytes32", "bytes32", "uint256"],
    [
      sourceChain,
      sourceAddress,
      contractAddress,
      payloadHash,
      sourceTxHash,
      sourceEventIndex,
    ]
  );
  // Define the commandId

  const commandId = ethers.utils.randomBytes(32);
  return {
    params,
    commandId,
    sourceChain,
    sourceAddress,
    payloadHash,
    payloadBytes,
  };
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
