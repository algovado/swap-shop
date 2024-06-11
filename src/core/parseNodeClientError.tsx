/* eslint-disable max-classes-per-file */

import { microalgosToAlgos } from "algosdk";
import { shortenAddress } from "./utils";

export type AlgoClientError = {
  response: {
    req: {
      method: "POST";
      url: string;
      data: unknown;
      headers: {};
    };
    text: string;
    statusText: string;
    statusCode: number;
    status: number;
    statusType: 4;
    body?: {
      message?: string;
    };
  };
};

export type AlgoClientErrorTypes =
  | "AssetDoesNotExistError"
  | "AssetNotInAccountError"
  | "AccountNotOptedInError"
  | "OverspendError"
  | "NotEnoughAssetsError"
  | "BelowMinError"
  | "AccountTooLargeError"
  | "InvalidGroupError"
  | "MalformedTransactionError"
  | "TransactionExpiredError"
  | "IncorrectWalletError";

type BaseErrorData = { transactionId: string };

export class ParsedAlgoClientError<
  T extends BaseErrorData = BaseErrorData
> extends Error {
  isAlgoClientError: true;

  original: AlgoClientError;

  resolution: string;

  data: T;

  type: AlgoClientErrorTypes;

  constructor(
    message: string,
    resolution: string,
    errorType: AlgoClientErrorTypes,
    data: T,
    error: AlgoClientError
  ) {
    super(message);
    this.isAlgoClientError = true;
    this.resolution = resolution;
    this.type = errorType;
    this.data = data;
    this.original = error;
  }
}

export class ParsedUnknownAlgoClientError extends Error {
  isAlgoClientError: true;

  original: AlgoClientError;

  resolution: string;

  data: {};

  type: "UnknownAlgoClientError";

  constructor(message: string, error: AlgoClientError) {
    super(message);
    this.isAlgoClientError = true;
    this.resolution = "Please contact support if the problem persists.";
    this.type = "UnknownAlgoClientError";
    this.data = {};
    this.original = error;
  }
}

type AssetDoesNotExistErrorData = BaseErrorData & { assetId: number };

const parseAssetDoesNotExistError = (
  e: AlgoClientError
): ParsedAlgoClientError<AssetDoesNotExistErrorData> | undefined => {
  const match = e.response.body?.message?.match(
    /^TransactionPool.Remember: transaction ([A-Z2-8]+): asset (\d+) does not exist or has been deleted$/
  );
  if (match) {
    const assetId = parseInt(match[2], 10);
    return new ParsedAlgoClientError<AssetDoesNotExistErrorData>(
      `Asset ${assetId} does not exist or has been deleted.`,
      "Double check the asset id and try again",
      "AssetDoesNotExistError",
      { transactionId: match[1], assetId },
      e
    );
  }
  return undefined;
};

type AssetNotInAccountErrorData = BaseErrorData & {
  assetId: number;
  account: string;
};

const parseAssetNotInAccountError = (
  e: AlgoClientError
): ParsedAlgoClientError<AssetNotInAccountErrorData> | undefined => {
  const match = e.response.body?.message?.match(
    /^TransactionPool.Remember: transaction ([A-Z2-8]+): asset index (\d+) not found in account ([A-Z2-8]+)$/
  );
  if (match) {
    const transactionId = match[1];
    const assetId = parseInt(match[2], 10);
    const account = match[3];
    return new ParsedAlgoClientError<AssetNotInAccountErrorData>(
      `Asset ${assetId} not found in account ${account}`,
      "Double check the asset id, make sure all relevant accounts are opted-in and try again",
      "AssetNotInAccountError",
      { transactionId, assetId, account },
      e
    );
  }
  return undefined;
};

type AccountNotOptedInErrorData = BaseErrorData & {
  assetId: number;
  account: string;
};

const parseAccountNotOptedInErrorData = (
  e: AlgoClientError
): ParsedAlgoClientError<AccountNotOptedInErrorData> | undefined => {
  const matchA = e.response.body?.message?.match(
    /^TransactionPool.Remember: transaction ([A-Z2-8]+): account ([A-Z2-8]+) has not opted in to asset (\d+)$/
  );
  const matchB = e.response.body?.message?.match(
    /^TransactionPool.Remember: transaction ([A-Z2-8]+): asset (\d+) missing from ([A-Z2-8]+)$/
  );
  if (matchA || matchB) {
    const transactionId = matchA ? matchA[1] : matchB![1];
    const assetId = parseInt(matchA ? matchA[3] : matchB![2], 10);
    const account = matchA ? matchA[2] : matchB![3];
    return new ParsedAlgoClientError<AccountNotOptedInErrorData>(
      `Account ${account} has not opted in to asset ${assetId}`,
      `Make sure the account has opted in to ${assetId}. You can do this via the wallet, or our opt-in tool.`,
      "AccountNotOptedInError",
      { transactionId, assetId, account },
      e
    );
  }
  return undefined;
};

type BelowMinErrorData = BaseErrorData & {
  account: string;
  balance: number;
  minBalance: number;
};

const parseBelowMinError = (
  e: AlgoClientError
): ParsedAlgoClientError<BelowMinErrorData> | undefined => {
  const match = e.response.body?.message?.match(
    /^TransactionPool.Remember: transaction ([A-Z2-8]+): account ([A-Z2-8]+) balance (\d+) below min (\d+) \((\d+) assets?\)$/
  );
  if (match) {
    const transactionId = match[1];
    const account = match[2];
    const balance = microalgosToAlgos(parseInt(match[3], 10));
    const minBalance = microalgosToAlgos(parseInt(match[4], 10));
    return new ParsedAlgoClientError<BelowMinErrorData>(
      `Transaction will put ${shortenAddress(
        account
      )} below min balance of ${minBalance}.`,
      "Algorand accounts have a minimum balance dependent on the number of assets and applications you have opted into. This transaction will put you below your minimum balance. Opt-out of some assets or applications, or increase your algo balance.",
      "BelowMinError",
      { transactionId, account, balance, minBalance },
      e
    );
  }
  return undefined;
};

type OverspendErrorData = BaseErrorData & {
  account: string;
  currentAmount: number;
};

const parseOverspendError = (
  e: AlgoClientError
): ParsedAlgoClientError<OverspendErrorData> | undefined => {
  const match = e.response.body?.message?.match(
    /^TransactionPool.Remember: transaction ([A-Z2-8]+): overspend \(account ([A-Z2-8]+).*MicroAlgos:{Raw:(\d+)/
  );
  if (match) {
    const transactionId = match[1];
    const account = match[2];
    const currentAmount = microalgosToAlgos(parseInt(match[3], 10));
    return new ParsedAlgoClientError<OverspendErrorData>(
      `Not enough algo to cover transaction. ${shortenAddress(
        account
      )} contains ${currentAmount} algo.`,
      "Check the amount of algo in your account, remember you need to be able to afford transaction fees and minimum balance.",
      "OverspendError",
      { transactionId, account, currentAmount },
      e
    );
  }
  return undefined;
};

// TransactionPool.Remember: transaction PXGLVFHZJOYHIIPONN6YKYP2EOKQ3N3M3PPPQGARD5L7U2MLGQ6A: underflow on subtracting 10000000 from sender amount 954443
type NotEnoughAssetsErrorData = BaseErrorData & {
  transactionAmount: number;
  actualAmount: number;
};

const parseNotEnoughAssetsError = (
  e: AlgoClientError
): ParsedAlgoClientError<NotEnoughAssetsErrorData> | undefined => {
  const match = e.response.body?.message?.match(
    /^TransactionPool.Remember: transaction ([A-Z2-8]+): underflow on subtracting (\d+) from sender amount (\d+)$/
  );
  if (match) {
    const transactionId = match[1];
    const transactionAmount = parseInt(match[2], 10);
    const actualAmount = parseInt(match[3], 10);
    return new ParsedAlgoClientError<NotEnoughAssetsErrorData>(
      `Not enough of one or more assets.`,
      "The transaction will cause an account to drop below its available balance of one or more assets. Check the transaction and make sure all accounts meet the requirements.",
      "NotEnoughAssetsError",
      { transactionId, transactionAmount, actualAmount },
      e
    );
  }
  return undefined;
};

type AccountTooLargeErrorData = BaseErrorData & {
  account: string;
};

const parseAccountTooLargeError = (
  e: AlgoClientError
): ParsedAlgoClientError<AccountTooLargeErrorData> | undefined => {
  const match = e.response.body?.message?.match(
    /^TransactionPool.Remember: transaction ([A-Z2-8]+): account ([A-Z2-8]+) would use too much space after this transaction/
  );
  if (match) {
    const transactionId = match[1];
    const account = match[2];
    return new ParsedAlgoClientError<AccountTooLargeErrorData>(
      `Account ${account} is larger than algorand network allows.`,
      "Each algorand account has a size limit, based on the number of assets, and size of applications it can opt into. This transaction would put the account over the limit. Opt-out of some assets or applications, or use a different wallet.",
      "AccountTooLargeError",
      { transactionId, account },
      e
    );
  }
  return undefined;
};

type InvalidGroupErrorData = BaseErrorData & {};

const parseInvalidGroupError = (
  e: AlgoClientError
): ParsedAlgoClientError<InvalidGroupErrorData> | undefined => {
  const tests = [
    [
      /^TransactionPool.Remember: transaction ([A-Z2-8]+): group size \d+ exceeds maximum (\d+)/,
      (m: string[]) => `Too many transactions in this group. Maximum ${m[2]}.`,
    ],
    [
      /^TransactionPool.Remember: transaction ([A-Z2-8]+): transactionGroup: incomplete group/,
      (m: string[]) =>
        `Not all transactions belonging to this group were submitted.`,
    ],
    [
      /^TransactionPool.Remember: transaction ([A-Z2-8]+): transactionGroup: \[(\d+)\] had zero Group but was submitted in a group/,
      (m: string[]) =>
        `Transaction does not belong to a group, but was submitted as part of one.`,
    ],
    [
      /^TransactionPool.Remember: transaction ([A-Z2-8]+): transactionGroup: inconsistent group values/,
      (m: string[]) => `Transaction submitted as part of wrong group.`,
    ],
  ] as [RegExp, (m: string[]) => string][];
  for (const [matcher, title] of tests) {
    const match = e.response.body?.message?.match(matcher);
    if (match) {
      const transactionId = match[1];
      return new ParsedAlgoClientError<InvalidGroupErrorData>(
        `Invalid group transaction: ${title(match)}`,
        'Algorand transactions can be grouped together as part of an "Atomic Transaction". These are great because if one transaction in the group fails, all the others will be made invalid. However in this case, there was an error processing the group as a whole.',
        "InvalidGroupError",
        { transactionId },
        e
      );
    }
  }
  return undefined;
};

type MalformedTransactionErrorData = BaseErrorData & {};

const parseMalformedTransactionError = (
  e: AlgoClientError
): ParsedAlgoClientError<MalformedTransactionErrorData> | undefined => {
  const tests = [
    [
      /^TransactionPool.Remember: transaction ([A-Z2-8]+): (Unknown transaction type .*)$/,
      (m: string[]) => m[2],
    ],
    [
      /^TransactionPool.Remember: transaction ([A-Z2-8]+): malformed (.*)$/,
      (m: string[]) => m[2],
    ],
  ] as [RegExp, (m: string[]) => string][];
  for (const [matcher, title] of tests) {
    const match = e.response.body?.message?.match(matcher);
    if (match) {
      const transactionId = match[1];
      return new ParsedAlgoClientError<MalformedTransactionErrorData>(
        `Malformed Transaction: ${title(match)}`,
        "Something was wrong with the transaction. Get in touch with the sender to try resolving the problem.",
        "MalformedTransactionError",
        { transactionId },
        e
      );
    }
  }
  return undefined;
};

type TransactionExpiredErrorData = BaseErrorData & {
  minRound?: number;
  maxRound: number;
  currentRound: number;
};

const parseTransactionExpiredError = (
  e: AlgoClientError
): ParsedAlgoClientError<TransactionExpiredErrorData> | undefined => {
  const tests = [
    [
      /^TransactionPool.Remember: transaction ([A-Z2-8]+): endOfBlock found .* round \((\d+)\) was not less than current round \((\d+)\)$/,
      (m: string[]) =>
        `Transaction expired in round ${m[2]}. Current round is ${m[3]}.`,
      (m: string[]) => ({
        transactionId: m[1],
        maxRound: parseInt(m[2], 10),
        currentRound: parseInt(m[3], 10),
      }),
    ],
    [
      /^TransactionPool.Remember: txn dead: round (\d+) outside of (\d+)--(\d+)$/,
      (m: string[]) =>
        `Transaction only valid between rounds ${m[2]}-${m[3]}. Current round is ${m[1]}.`,
      (m: string[]) => ({
        transactionId: "dead",
        minRound: parseInt(m[2], 10),
        maxRound: parseInt(m[3], 10),
        currentRound: parseInt(m[1], 10),
      }),
    ],
  ] as [
    RegExp,
    (m: string[]) => string,
    (m: string[]) => TransactionExpiredErrorData
  ][];
  for (const [matcher, title, data] of tests) {
    const match = e.response.body?.message?.match(matcher);
    if (match) {
      return new ParsedAlgoClientError<TransactionExpiredErrorData>(
        title(match),
        "Get the sender of this transaction to create you a new transaction to sign.",
        "TransactionExpiredError",
        data(match),
        e
      );
    }
  }
  return undefined;
};

type IncorrectWalletErrorData = BaseErrorData & {
  correctWallet: string;
  receivedWallet: string;
};

const parseIncorrectWalletErrorData = (
  e: AlgoClientError
): ParsedAlgoClientError<IncorrectWalletErrorData> | undefined => {
  const match = e.response.body?.message?.match(
    /^TransactionPool.Remember: transaction ([A-Z2-8]+): should have been authorized by ([A-Z2-8]+) but was actually authroized by ([A-Z2-8]+)$/
  );
  if (match) {
    const transactionId = match[1];
    const correctWallet = match[2];
    const receivedWallet = match[3];
    return new ParsedAlgoClientError<IncorrectWalletErrorData>(
      `Transaction was signed by the incorrect wallet. Was signed by ${receivedWallet}. Expected ${correctWallet}.`,
      "Not all transactions can be signed by all wallets. Ensure you are the correct recipient for this transaction. Make sure you have selected the correct wallet in the selection dropdown.",
      "IncorrectWalletError",
      { transactionId, correctWallet, receivedWallet },
      e
    );
  }
  return undefined;
};

const errorParsers = [
  parseAssetDoesNotExistError,
  parseAssetNotInAccountError,
  parseAccountNotOptedInErrorData,
  parseBelowMinError,
  parseOverspendError,
  parseTransactionExpiredError,
  parseIncorrectWalletErrorData,
  parseInvalidGroupError,
  parseNotEnoughAssetsError,
  parseMalformedTransactionError,
  parseAccountTooLargeError,
];

const parseUnknownError = (e: AlgoClientError): ParsedUnknownAlgoClientError =>
  new ParsedUnknownAlgoClientError(
    `Unknown algo client error ${
      e.response.body?.message || e.response.status
    }`,
    e
  );

const parseClientError = (e: AlgoClientError) => {
  for (const parser of errorParsers) {
    const parsed = parser(e);
    if (parsed) {
      return parsed;
    }
  }
  return parseUnknownError(e);
};

export default parseClientError;
