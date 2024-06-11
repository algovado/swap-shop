import { SignedTransaction, Transaction } from "algosdk";

export interface AccountDataType {
  amount: number;
  "min-balance": number;
  "total-assets-opted-in": number;
  "total-created-assets": number;
}

export interface AssetsType {
  amount: number;
  "asset-id": number;
  "opted-in-at-round": number;
}

export interface AccountAssetsDataResponse {
  assets: AssetsType[];
  "next-token": string;
}

export interface AssetParamsType {
  creator: string;
  decimals: number;
  manager: string;
  name: string;
  reserve: string;
  total: number;
  "unit-name": string;
  url: string;
  clawback: string;
  freeze: string;
  "default-frozen"?: boolean;
}

export interface SingleAssetDataResponse {
  index: number;
  "created-at-round"?: number;
  deleted?: boolean;
  params: AssetParamsType;
}

interface AssetTransaction {
  "confirmed-round": number;
  note: string;
}

export interface AssetTransactionsResponse {
  "current-round": number;
  "next-token": string;
  transactions: AssetTransaction[];
}

export interface SignTransactionsType {
  txn: Transaction;
  signers: string[];
}

export interface SwapTransaction {
  id: number;
  sender: string | null;
  receiver: string | null;
  assetId: number | null;
  amount: number | null;
  txType: "pay" | "axfer" | "optin" | "";
}

export interface ShareTransaction {
  "confirmed-round": number;
  "first-valid": number;
  "last-valid": number;
  "genesis-id": string;
  id: string;
  note: string;
  "round-time": number;
  sender: string;
  "tx-type": string;
  group?: string
}

export interface ShareTransactionResponse {
  "current-round": number;
  transaction: ShareTransaction;
}

export interface DecodedTransactionType {
  tx: Transaction | SignedTransaction;
  isSigned: boolean;
  transactionBytes: Uint8Array;
}