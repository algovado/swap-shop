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

const algoTxn = makePaymentTxnWithSuggestedParamsFromObject({
  from: SENDER,
  to: RECEIVER,
  amount: algosToMicroalgos(ALGO_AMOUNT),
  suggestedParams: params,
});

const assetTxn = makeAssetTransferTxnWithSuggestedParamsFromObject({
  from: RECEIVER,
  to: SENDER,
  amount: ASSET_AMOUNT,
  assetIndex: ASSET_ID,
  suggestedParams: params,
});

const swapTxns = [algoTxn, assetTxn]

const groupId = computeGroupID(swapTxns);
swapTxns.forEach((txn) => {
  txn.group = groupId;
});

const signedTxns = await signTransactions(swapTxns);
const mergedTxns = mergeSignedAndUnsignedTransactions(
  signedTxns,
  swapTxns
);

// CREATE A TX (OR GROUP) FOR SHARE URL
var transactionNote = concatenateTransactions(mergedTxns);
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

const shareTxns = [];

for (let i = 0; i < notes.length; i++) {
  const transaction = makePaymentTxnWithSuggestedParamsFromObject({
    from: sender,
    to: receiver,
    amount: algosToMicroalgos(amount),
    suggestedParams: params,
    note: notes[i],
  });
  shareTxns.push(transaction);
}
var shareGroupId = computeGroupID(shareTxns);
var shareTxnIds = [] as string[];
shareTxns.forEach((txn) => {
  txn.group = shareGroupId;
  shareTxnIds.push(txn.txID());
});
const signedShareTxns = await signTransactions(transactions);
await sendSignedTransaction(signedShareTxns);
// SHARE THIS URL WITH OTHER PARTY
var SHARE_URL = "https://swapshop.thurstober.com/claim?txid=signedShareTxns[0]"
if (shareTxnIds.length > 1) {
  for (let i = 1; i < shareTxnIds.length; i++) {
    SHARE_URL += "&txid=" + shareTxnIds[i];
  }
}
console.log(SHARE_URL)
```
### Python
```py
# Util Function
def generate_swap_shop_note(txns: List[transaction.Transaction]):
    # Convert Transaction Objects into byte array representations
    encoded_txns = [msgpack.packb(txn.dictify()) for txn in txns]
    # Build List of lengths for each transaction that will end up in the note(s) field
    lengths = [len(txn) for txn in encoded_txns]
    # Build the header/prefix with info needed to build Transactions on the otherside
    metadata = f"{len(encoded_txns)}:{':'.join(map(str, lengths))}$".encode("utf-8") 
    # Join all the info together into expected byte array shoved in the note(s)
    return bytearray(metadata + b"".join(encoded_txns))

# Encode Group Txn
swap_shop_note = generate_swap_shop_note([txn for txn in group_txns])  

# Chunkify encoded txns into 1000 char bites for note fields
chunk_size = 1000
chunks = [swap_shop_mega_note[i:i+chunk_size] for i in range(0, len(swap_shop_mega_note), chunk_size)]

# Create wrapper txns which will contain the encoded chunks
wrapper_txns: List[transaction.Transaction] = []
for chunk in chunks:
    txn = transaction.PaymentTxn(
        sender=WRAPPER_SENDER,
        sp=params,
        receiver=WRAPPER_RECEIVER,
        amt=algos_to_microalgos(WRAPPER_AMOUNT),
        note=chunk
    )
    wrapper_txns.append(txn)

# Create, sign, and submit wrapper txn group
signed_txns: List[transaction.Transaction] = []
group_id = transaction.calculate_group_id(wrapper_txns)
for txn in wrapper_txns:
    txn.group = group_id
    signed_txns.append(txn.sign(secret_key))

signed_txns_ids = "".join([f"txid={signed_txns[0].get_txid()}"] + [f"&txid={txn.get_txid()}" for txn in signed_txns[1:]])

txid = client.send_transactions(signed_txns)    
wait_for_confirmation(client,txid)
print(txid)

print(f"{SWAP_SHOP_URL}{signed_txns_ids}")
```
## Deployment

Changes that are merged to `main` will be deployed automatically to [Swap Shop](https://swapshop.thurstober.com/).

## Contributing

To contribute, fork this repo and propose changes back via Pull Request.  One of the team members will review and merge your changes.  

Feel free to reach out to [bykewel](https://twitter.com/cryptolews) if you have any questions or suggestions.

Also we used some of the code from [alg-tx](https://github.com/unknown-git-user/alg-tx).

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details
