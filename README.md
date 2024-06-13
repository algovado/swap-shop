# Swap Shop

The ability to claim a designed NFT, the ability to automatically claim a giveaway win, the ability to buy tokens, and the ability to create a swap shop.
To increase the functionality, also be making a Discord bot as an [example](https://github.com/algovado/swap-shop?tab=readme-ov-file#example-codes-for-using-your-botsprojects)
We hope that this will make it easier to adopt this free to use software. In addition, those who do not know how to code will be able to manually set up a swap themselves through a no-code interface.

This project funded by Algorand Foundation's [xGov](https://xgov.algorand.foundation) program.

![af](public/images/af_logo.svg)

----------

## Installation

You need to have [Node.js](https://nodejs.org/en/) installed on your machine.  

Then, clone this repo:

```bash
git clone https://github.com/algovado/swap-shop
```

And run the following commands:

```bash
npm install
npm run start
```

## Example Codes for Using Your Bots/Projects

### JavaScript/TypeScript

* Before you start, you need to install required packages:

```bash
npm i algosdk
```

* You can check [utils.ts](https://github.com/algovado/swap-shop/blob/main/src/core/utils.ts) for some utility functions.

```ts
const SENDER = "<SENDER_ADDRESS>";
const RECEIVER = "<RECEIVER_ADDRESS>";
const ALGO_AMOUNT = 5; // Algos
const ASSET_ID = 1234; // Asset ID
const ASSET_AMOUNT = 1; // Asset amount

// CREATE A SWAP PART
const params = await algodClient.getTransactionParams().do();

const transaction = makePaymentTxnWithSuggestedParamsFromObject({
  from: SENDER,
  to: RECEIVER,
  amount: algosToMicroalgos(ALGO_AMOUNT),
  suggestedParams: params,
});

const transaction_2 = makeAssetTransferTxnWithSuggestedParamsFromObject({
  from: RECEIVER,
  to: SENDER,
  amount: ASSET_AMOUNT,
  assetIndex: ASSET_ID,
  suggestedParams: params,
});

const groupId = computeGroupID([transaction, transaction_2]);
transaction.group = groupId;
transaction_2.group = groupId;

const signedTxns = transaction.signTxn(SENDER_SK);
const mergedTxns = mergeSignedAndUnsignedTransactions(signedTxns, [
  transaction,
  transaction_2,
]);

// CREATE A TX (OR GROUP) FOR SHARE URL
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

// SHARE THIS URL WITH OTHER PARTY
const SHARE_URL = "https://swapshop.thurstober.com/claim?tx=signedShareTxns[0]"
if (txIds.length > 1) {
  for (let i = 1; i < txIds.length; i++) {
    SHARE_URL += "&tx=" + txIds[i];
  }
}
```

## Deployment

Changes that are merged to `main` will be deployed automatically to [Swap Shop](https://swapshop.thurstober.com/).

## Contributing

To contribute, fork this repo and propose changes back via Pull Request.  One of the team members will review and merge your changes.  

Feel free to reach out to [bykewel](https://twitter.com/cryptolews) if you have any questions or suggestions.

Also we used some of the code from [alg-tx](https://github.com/unknown-git-user/alg-tx).

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
