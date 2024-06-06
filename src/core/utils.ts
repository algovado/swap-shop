import { DeflyWalletConnect } from "@blockshake/defly-connect";
import { DaffiWalletConnect } from "@daffiwallet/connect";
import { PeraWalletConnect } from "@perawallet/connect";
import { Algodv2, Transaction, waitForConfirmation } from "algosdk";
import axios from "axios";
import useConnectionStore from "../store/connectionStore";
import { INDEXER_URL, NODE_URL } from "./constants";
import {
  AccountAssetsDataResponse,
  AccountDataType,
  AssetsType,
  SignTransactionsType,
  SingleAssetDataResponse,
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
        return { txn: txn, signers: [signer] };
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
