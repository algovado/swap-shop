import { DeflyWalletConnect } from "@blockshake/defly-connect";
import { DaffiWalletConnect } from "@daffiwallet/connect";
import { PeraWalletConnect } from "@perawallet/connect";
import {
  Algodv2,
  Transaction,
  isValidAddress,
  makeAssetTransferTxnWithSuggestedParamsFromObject,
  makePaymentTxnWithSuggestedParamsFromObject,
  waitForConfirmation,
  algosToMicroalgos,
  microalgosToAlgos,
  computeGroupID,
  decodeSignedTransaction,
  decodeUnsignedTransaction,
  encodeAddress,
} from "algosdk";
import axios from "axios";
import useConnectionStore from "../store/connectionStore";
import { INDEXER_URL, NODE_URL, TRANSACTION_TYPES } from "./constants";
import {
  AccountAssetsDataResponse,
  AccountDataType,
  AssetsType,
  DecodedTransactionType,
  ShareTransaction,
  ShareTransactionResponse,
  SignTransactionsType,
  SingleAssetDataResponse,
  SwapTransaction,
} from "./types";

const peraWallet = new PeraWalletConnect({ shouldShowSignTxnToast: true });
const deflyWallet = new DeflyWalletConnect({ shouldShowSignTxnToast: true });
const daffiWallet = new DaffiWalletConnect({ shouldShowSignTxnToast: true });
const algodClient = new Algodv2("", NODE_URL, "");

export const shortenAddress = (walletAddress: string, count: number = 4) => {
  return (
    walletAddress.substring(0, count) +
    "..." +
    walletAddress.substring(walletAddress.length - count)
  );
};

export async function getAccountData(
  walletAddress: string
): Promise<AccountDataType> {
  const response = await axios.get(
    NODE_URL + `/v2/accounts/${walletAddress}?exclude=all`
  );
  return response.data as AccountDataType;
}

export function getAssetDirectionUrl(assetId: number) {
  return "https://we.thurstober.com/asset/" + assetId;
}

export function getWalletDirectionUrl(walletAddress: string) {
  return "https://we.thurstober.com/account/" + walletAddress;
}

export async function getOwnerAddressOfAsset(assetId: number) {
  try {
    const url = `${INDEXER_URL}/v2/assets/${assetId}/balances?currency-greater-than=0`;
    const response = await axios.get(url);
    return response.data.balances[0].address;
  } catch (err) {
    return "";
  }
}

export async function getAssetsFromAddress(
  walletAddress: string
): Promise<AssetsType[]> {
  let threshold = 1000;
  let userAssets = await axios.get<AccountAssetsDataResponse>(
    `${INDEXER_URL}/v2/accounts/${walletAddress}/assets?include-all=false`
  );
  while (userAssets.data.assets.length === threshold) {
    const nextAssets = await axios.get(
      `${INDEXER_URL}/v2/accounts/${walletAddress}/assets?include-all=false&next=${userAssets.data["next-token"]}`
    );
    userAssets.data.assets = userAssets.data.assets.concat(
      nextAssets.data.assets
    );
    userAssets.data["next-token"] = nextAssets.data["next-token"];
    threshold += 1000;
  }
  return userAssets.data.assets.sort(
    (a, b) => b["opted-in-at-round"] - a["opted-in-at-round"]
  );
}

export async function getCreatedAssetsFromAddress(
  walletAddress: string
): Promise<SingleAssetDataResponse[]> {
  let threshold = 1000;
  let createdAssets = await axios.get(
    `${INDEXER_URL}/v2/accounts/${walletAddress}/created-assets?include-all=false`
  );
  while (createdAssets.data.assets.length === threshold) {
    const nextAssets = await axios.get(
      `${INDEXER_URL}/v2/accounts/${walletAddress}/created-assets?include-all=false&next=${createdAssets.data["next-token"]}`
    );
    createdAssets.data.assets = createdAssets.data.assets.concat(
      nextAssets.data.assets
    );
    createdAssets.data["next-token"] = nextAssets.data["next-token"];
    threshold += 1000;
  }
  return createdAssets.data.assets;
}

export async function getAssetData(
  assetId: number
): Promise<SingleAssetDataResponse> {
  const data = await axios.get(
    `${INDEXER_URL}/v2/assets/${assetId}?include-all=true`
  );
  if (data.status !== 200) {
    throw new Error("Invalid Asset Id");
  }
  return data.data.asset as SingleAssetDataResponse;
}

export async function getNfdDomain(wallet: string): Promise<string> {
  try {
    const nfdDomain = await axios.get(
      "https://api.nf.domains/nfd/lookup?address=" + wallet
    );
    if (nfdDomain.status === 200) {
      return nfdDomain.data[wallet].name;
    } else {
      return wallet;
    }
  } catch (error) {
    return wallet;
  }
}

export async function getWalletAddressFromNfDomain(
  domain: string
): Promise<string> {
  try {
    const response = await axios.get(
      `https://api.nf.domains/nfd/${domain}?view=tiny&poll=false&nocache=false`
    );
    if (response.status === 200) {
      return response.data.depositAccount;
    } else {
      return "";
    }
  } catch (error) {
    return "";
  }
}

export async function signTransactions(
  groups: Transaction[],
  signer: string = ""
) {
  let signedTxns;
  let multipleTxnGroups;
  const { walletAddress, walletType } = useConnectionStore.getState();
  if (!walletAddress) {
    throw new Error("Please connect your wallet!");
  }
  signer = signer || walletAddress;
  try {
    if (walletType === "pera") {
      await peraWallet.reconnectSession();
      multipleTxnGroups = groups.map((txn) => {
        return { txn: txn, signers: [encodeAddress(txn.from.publicKey)] };
      });
      signedTxns = await peraWallet.signTransaction([
        multipleTxnGroups as SignTransactionsType[],
      ]);
    } else if (walletType === "defly") {
      await deflyWallet.reconnectSession();
      multipleTxnGroups = groups.map((txn) => {
        return { txn: txn, signers: [signer] };
      });
      signedTxns = await deflyWallet.signTransaction([
        multipleTxnGroups as SignTransactionsType[],
      ]);
    } else if (walletType === "daffi") {
      await daffiWallet.reconnectSession();
      multipleTxnGroups = groups.map((txn) => {
        return { txn: txn, signers: [signer] };
      });
      signedTxns = await daffiWallet.signTransaction([
        multipleTxnGroups as SignTransactionsType[],
      ]);
    } else {
      throw new Error("Invalid wallet type!");
    }
    if (signedTxns.length === 0) {
      throw new Error("Transaction signing failed!");
    }
    return signedTxns;
  } catch (error) {
    throw new Error("Transaction signing failed");
  }
}

export async function sendSignedTransaction(signedTxns: Uint8Array[]) {
  try {
    const { txId } = await algodClient.sendRawTransaction(signedTxns).do();
    await waitForConfirmation(algodClient, txId, 3);
    return txId;
  } catch (error) {
    throw error;
  }
}

export async function createSignedSwapTransactions(
  swapTransactions: SwapTransaction[]
) {
  var nfdDomainData: { [key: string]: string } = {};
  var assetDecimals: { [key: string]: number } = {};

  for (let i = 0; i < swapTransactions.length; i++) {
    const swapTx = swapTransactions[i];
    if (swapTx.txType === "pay") {
      swapTx.assetId = 1;
    }
    if (swapTx.txType === "optin") {
      swapTx.amount = 0;
      swapTx.receiver = swapTx.sender;
    }

    if (
      !swapTx.id ||
      !swapTx.txType ||
      !swapTx.receiver ||
      !swapTx.sender ||
      swapTx.assetId === null ||
      swapTx.assetId === undefined ||
      swapTx.assetId < 0 ||
      swapTx.amount == null ||
      swapTx.amount === undefined ||
      swapTx.amount < 0
    ) {
      throw new Error(
        `Invalid transaction! Please check the transaction ${i + 1}.`
      );
    }

    if (
      !TRANSACTION_TYPES.map((t) => t.type.toLowerCase()).includes(
        swapTx.txType.toLowerCase()
      )
    ) {
      throw new Error(
        `Transaction ${i} has an invalid 'type'. It must be one of "pay", "axfer" or "optin".`
      );
    }

    if (Number.isNaN(swapTx.amount) || swapTx.amount < 0) {
      throw new Error(`Invalid Amount for transaction ${i + 1}`);
    }

    if (swapTx.sender.includes(".algo")) {
      const walletAddress = await getWalletAddressFromNfDomain(swapTx.sender);
      if (walletAddress === "") {
        throw new Error(`Invalid Sender for transaction ${i + 1}`);
      }
      nfdDomainData[swapTx.sender] = walletAddress;
    } else {
      if (!isValidAddress(swapTx.sender)) {
        throw new Error(`Invalid Sender for transaction ${i + 1}`);
      }
    }

    if (swapTx.receiver.includes(".algo")) {
      const walletAddress = await getWalletAddressFromNfDomain(swapTx.receiver);
      if (walletAddress === "") {
        throw new Error(`Invalid Receiver for transaction ${i + 1}`);
      }
      nfdDomainData[swapTx.receiver] = walletAddress;
    } else {
      if (!isValidAddress(swapTx.receiver)) {
        throw new Error(`Invalid Receiver for transaction ${i + 1}`);
      }
    }

    if (!Number.isInteger(swapTx.assetId) || swapTx.assetId < 0) {
      throw new Error(`Invalid Asset Id for transaction ${i + 1}`);
    } else {
      if (swapTx.assetId !== 1) {
        try {
          const assetData = await getAssetData(swapTx.assetId);
          assetDecimals[swapTx.assetId] = assetData.params.decimals;
        } catch (error) {
          console.log(error);
          throw new Error(`Invalid Asset Id for transaction ${i + 1}`);
        }
      }
    }
  }

  var uniqueSenders = [];
  for (let i = 0; i < swapTransactions.length; i++) {
    if (
      swapTransactions[i].sender &&
      swapTransactions[i].sender!.includes(".algo")
    ) {
      uniqueSenders.push(nfdDomainData[swapTransactions[i].sender!]);
    } else {
      uniqueSenders.push(swapTransactions[i].sender!);
    }
  }
  uniqueSenders = [...new Set(uniqueSenders)];
  if (uniqueSenders.length > 2) {
    throw new Error(
      "There can be up to two different sender wallet addresses."
    );
  }

  var transactions = [];
  const params = await algodClient.getTransactionParams().do();

  for (let i = 0; i < swapTransactions.length; i++) {
    const swapTx = swapTransactions[i];
    var transaction;
    if (swapTx.txType === "pay") {
      transaction = makePaymentTxnWithSuggestedParamsFromObject({
        from: swapTx.sender?.includes(".algo")
          ? nfdDomainData[swapTx.sender]
          : swapTx.sender!,
        to: swapTx.receiver?.includes(".algo")
          ? nfdDomainData[swapTx.receiver]
          : swapTx.receiver!,
        amount: algosToMicroalgos(swapTx.amount!),
        suggestedParams: params,
      });
    } else if (swapTx.txType === "axfer") {
      transaction = makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: swapTx.sender?.includes(".algo")
          ? nfdDomainData[swapTx.sender]
          : swapTx.sender!,
        to: swapTx.receiver?.includes(".algo")
          ? nfdDomainData[swapTx.receiver]
          : swapTx.receiver!,
        amount: swapTx.amount! * Math.pow(10, assetDecimals[swapTx.assetId!]),
        assetIndex: swapTx.assetId!,
        suggestedParams: params,
      });
    } else if (swapTx.txType === "optin") {
      transaction = makeAssetTransferTxnWithSuggestedParamsFromObject({
        from: swapTx.sender?.includes(".algo")
          ? nfdDomainData[swapTx.sender]
          : swapTx.sender!,
        to: swapTx.sender?.includes(".algo")
          ? nfdDomainData[swapTx.sender]
          : swapTx.sender!,
        amount: 0,
        assetIndex: swapTx.assetId!,
        suggestedParams: params,
      });
    } else {
      throw new Error(`Invalid transaction type for transaction ${i + 1}`);
    }
    transactions.push(transaction);
  }
  try {
    const groupId = computeGroupID(transactions);
    transactions.forEach((txn) => {
      txn.group = groupId;
    });
    const signedTxns = await signTransactions(transactions);
    const mergedTxns = mergeSignedAndUnsignedTransactions(
      signedTxns,
      transactions
    );
    return mergedTxns;
  } catch (error) {
    console.log(error);
    throw new Error("Transaction signing failed");
  }
}

export function mergeSignedAndUnsignedTransactions(
  signedTxns: Uint8Array[],
  allTxns: Transaction[]
): Uint8Array[] {
  const signedTxnsDecoded = signedTxns.map((st) => decodeSignedTransaction(st));
  const signedTxnIds = signedTxnsDecoded.map((st) => st.txn.txID());
  const allTxnIds = allTxns.map((ut) => ut.txID());
  var mergedTxns = [] as Uint8Array[];
  var signedTxnsIndex = 0;
  for (let i = 0; i < allTxns.length; i++) {
    if (signedTxnIds.includes(allTxnIds[i])) {
      mergedTxns.push(signedTxns[signedTxnsIndex]);
      signedTxnsIndex++;
    } else {
      mergedTxns.push(allTxns[i].toByte());
    }
  }
  return mergedTxns;
}

export function mergeSignedTransactions(
  signedTxns: Uint8Array[],
  allTxns: Uint8Array[]
): Uint8Array[] {
  // same logic but for signed transactions
  const signedTxnsDecoded = signedTxns.map((st) => decodeSignedTransaction(st));
  const signedAllTxnsDecoded = allTxns.map((st) => decodeTransaction(st));
  const signedTxnIds = signedTxnsDecoded.map((st) => st.txn.txID());
  const allTxnIds = signedAllTxnsDecoded.map((st) =>
    decodeTransactionv2(st.transactionBytes).txID()
  );

  var mergedTxns = [] as Uint8Array[];
  var signedTxnsIndex = 0;

  for (let i = 0; i < allTxns.length; i++) {
    if (signedTxnIds.includes(allTxnIds[i])) {
      mergedTxns.push(signedTxns[signedTxnsIndex]);
      signedTxnsIndex++;
    } else {
      mergedTxns.push(allTxns[i]);
    }
  }
  return mergedTxns;
}

export async function createSignedPaymentTransaction(
  sender: string,
  receiver: string,
  amount: number,
  signedTxns: Uint8Array[]
) {
  try {
    const params = await algodClient.getTransactionParams().do();
    var transactionNote = concatenateTransactions(signedTxns);
    const notes = [];
    let note = new Uint8Array();
    for (let i = 0; i < transactionNote.length; i++) {
      if (note.length === 1000) {
        notes.push(note);
        note = new Uint8Array();
      }
      note = new Uint8Array([...note, transactionNote[i]]);
    }
    if (note.length > 0) {
      notes.push(note);
    }
    var transactions = [];
    for (let i = 0; i < notes.length; i++) {
      const transaction = makePaymentTxnWithSuggestedParamsFromObject({
        from: sender,
        to: receiver,
        amount: algosToMicroalgos(amount),
        suggestedParams: params,
        note: notes[i],
      });
      transactions.push(transaction);
    }
    var groupId = computeGroupID(transactions);
    var txIds = [] as string[];
    transactions.forEach((txn) => {
      txn.group = groupId;
      txIds.push(txn.txID());
    });
    const signedShareTxns = await signTransactions(transactions);
    await sendSignedTransaction(signedShareTxns);
    return txIds;
  } catch (error: any) {
    console.log(error);
    throw new Error(error.message || "Transaction failed");
  }
}

export async function getTransactionData(
  txId: string
): Promise<ShareTransactionResponse | null> {
  try {
    const response = await axios.get(INDEXER_URL + `/v2/transactions/${txId}`);
    if (response.status === 200) {
      return response.data as ShareTransactionResponse;
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

function concatenateTransactions(uint8arrays: Uint8Array[]) {
  // <count>:<length1>:<length2>:...<lengthN>$<data1><data2>...<data16>
  let count = uint8arrays.length;
  let lengths = uint8arrays.map((u) => u.length);
  let totalLength = lengths.reduce((acc, l) => acc + l, 0);
  let metadata = new Uint8Array(
    new TextEncoder().encode(`${count}:${lengths.join(":")}$`)
  );
  let result = new Uint8Array(metadata.length + totalLength);
  result.set(metadata, 0);
  let offset = metadata.length;
  uint8arrays.forEach((u) => {
    result.set(u, offset);
    offset += u.length;
  });
  return result;
}

function deconcatenateTransactions(uint8array: Uint8Array): Uint8Array[] {
  const data = new TextDecoder().decode(uint8array);
  const metadata = data.split("$")[0];
  const [count, ...lengths] = metadata.split(":");
  const transactions = [];
  let offset = metadata.length + 1;
  for (let i = 0; i < Number(count); i++) {
    const length = Number(lengths[i]);
    var transaction = uint8array.slice(offset, offset + length);
    transactions.push(transaction);
    offset += length;
  }
  return transactions;
}

export async function getSwapTransactionsFromNotes(
  shareTransactions: ShareTransaction[]
) {
  const notes = shareTransactions.map((st) => st.note);
  const decodedNotes = notes.map((note) =>
    Uint8Array.from(atob(note), (c) => c.charCodeAt(0))
  );
  var mergedNotes = new Uint8Array();
  for (let i = 0; i < decodedNotes.length; i++) {
    mergedNotes = new Uint8Array([...mergedNotes, ...decodedNotes[i]]);
  }
  const transactions = deconcatenateTransactions(mergedNotes);
  const decodedTransactions = transactions.map((txn) => decodeTransaction(txn));
  // convert swap transactions to the SwapTransaction
  const swapTransactions = [] as {
    swapTransaction: SwapTransaction;
    isSigned: boolean;
    transactionBytes: Uint8Array;
  }[];

  for (let index = 0; index < decodedTransactions.length; index++) {
    const dt = decodedTransactions[index];
    const txn = dt.isSigned ? (dt.tx as SignTransactionsType).txn : dt.tx;
    const { from, to, amount, assetIndex, type } = txn as Transaction;
    if (type === "pay") {
      swapTransactions.push({
        swapTransaction: {
          id: index,
          sender: encodeAddress(from.publicKey),
          receiver: encodeAddress(to.publicKey),
          assetId: 1,
          amount: microalgosToAlgos(amount as number),
          txType: "pay",
        },
        isSigned: dt.isSigned,
        transactionBytes: dt.transactionBytes,
      });
    } else if (type === "axfer") {
      if (
        encodeAddress(from.publicKey) === encodeAddress(to.publicKey) &&
        amount === undefined
      ) {
        swapTransactions.push({
          swapTransaction: {
            id: index,
            sender: encodeAddress(from.publicKey),
            receiver: encodeAddress(to.publicKey),
            assetId: assetIndex,
            amount: 0,
            txType: "optin",
          },
          isSigned: dt.isSigned,
          transactionBytes: dt.transactionBytes,
        });
      } else {
        const assetData = await getAssetData(assetIndex);
        const assetDecimals = assetData.params.decimals;
        swapTransactions.push({
          swapTransaction: {
            id: index,
            sender: encodeAddress(from.publicKey),
            receiver: encodeAddress(to.publicKey),
            assetId: assetIndex,
            amount: (amount as number) / Math.pow(10, assetDecimals),
            txType: "axfer",
          },
          isSigned: dt.isSigned,
          transactionBytes: dt.transactionBytes,
        });
      }
    }
  }

  return swapTransactions;
}

function decodeTransaction(transaction: Uint8Array): DecodedTransactionType {
  try {
    return {
      tx: decodeUnsignedTransaction(transaction),
      isSigned: false,
      transactionBytes: transaction,
    };
  } catch {
    return {
      tx: decodeSignedTransaction(transaction),
      isSigned: true,
      transactionBytes: transaction,
    };
  }
}

export function decodeTransactionv2(transaction: Uint8Array): Transaction {
  try {
    return decodeUnsignedTransaction(transaction);
  } catch {
    return decodeSignedTransaction(transaction).txn;
  }
}
