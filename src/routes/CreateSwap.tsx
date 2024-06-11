import { Button, CircularProgress } from "@mui/material";
import { SwapTransaction } from "../core/types";
import { useState } from "react";
import SwapTransactionComponent from "../components/SwapTransactionComponent";
import { toast } from "react-toastify";
import useConnectionStore from "../store/connectionStore";
import {
  createSignedPaymentTransaction,
  createSignedSwapTransactions,
} from "../core/utils";
import {
  MAX_SWAP_TRANSACTIONS,
  SHARE_TRANSACTION_RECEIVER_ADDRESS,
} from "../core/constants";

const LOADING_STEP = 0;
const START_STEP = 1;
const CREATED_TRANSACTIONS_STEP = 2;
const COMPLETED_STEP = 3;

export default function CreateSwap() {
  const connectionState = useConnectionStore((state) => state);
  const [swapTransactions, setSwapTransactions] = useState([
    {
      id: 1,
      sender: "bykewel.algo",
      receiver: "BYKWLR65FS6IBLJO7SKBGBJ4C5T257LBL55OUY6363QBWX24B5QKT6DMEA",
      amount: 0.5,
      assetId: null,
      txType: "pay",
    },
    {
      id: 2,
      sender: "bykewel.algo",
      receiver: "BYKWLR65FS6IBLJO7SKBGBJ4C5T257LBL55OUY6363QBWX24B5QKT6DMEA",
      amount: 2,
      assetId: 70315194,
      txType: "axfer",
    },
    {
      id: 3,
      sender: "RUDA4V6Z735GJJFRAMTRQKMSC7H57H323LLONSTSWUS55YE732ACXU6YMA",
      receiver: null,
      amount: null,
      assetId: 70315194,
      txType: "optin",
    },
    {
      id: 4,
      sender: "bykewel.algo",
      receiver: "BYKWLR65FS6IBLJO7SKBGBJ4C5T257LBL55OUY6363QBWX24B5QKT6DMEA",
      amount: 0.6,
      assetId: null,
      txType: "pay",
    },
    {
      id: 5,
      sender: "RUDA4V6Z735GJJFRAMTRQKMSC7H57H323LLONSTSWUS55YE732ACXU6YMA",
      receiver: "BYKWLR65FS6IBLJO7SKBGBJ4C5T257LBL55OUY6363QBWX24B5QKT6DMEA",
      amount: 0.2,
      assetId: null,
      txType: "pay",
    },
  ] as SwapTransaction[]);
  const [step, setStep] = useState(START_STEP);
  const [signedSwapTransactions, setSignedSwapTransactions] = useState<
    Uint8Array[] | null
  >(null);
  const [shareTransactionIds, setShareTransactionIds] = useState(
    [] as string[]
  );

  const addSwapTransaction = () => {
    if (swapTransactions.length >= MAX_SWAP_TRANSACTIONS) {
      toast.info(
        `You can only add up to ${MAX_SWAP_TRANSACTIONS} transactions per swap.`
      );
      return;
    }
    setSwapTransactions([
      ...swapTransactions,
      {
        id:
          swapTransactions.length > 0
            ? swapTransactions[swapTransactions.length - 1].id + 1
            : 1,
        sender: null,
        receiver: null,
        amount: null,
        assetId: null,
        txType: "",
      },
    ]);
  };

  const removeSwapTransaction = (id: number) => {
    setSwapTransactions(swapTransactions.filter((t) => t.id !== id));
  };

  const updateSwapTransaction = (
    id: number,
    field: "sender" | "receiver" | "amount" | "assetId" | "txType",
    value: string | number | null
  ) => {
    setSwapTransactions(
      swapTransactions.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const createSwapTransactions = async () => {
    try {
      if (swapTransactions.length < 2) {
        toast.info("Please add at least two transactions.");
        return;
      } else if (swapTransactions.length > MAX_SWAP_TRANSACTIONS) {
        toast.info(
          `You can only add up to ${MAX_SWAP_TRANSACTIONS} transactions per swap.`
        );
        return;
      }
      if (connectionState.walletAddress === "") {
        toast.info("Please connect your wallet!");
        return;
      }
      setStep(LOADING_STEP);
      try {
        var signedSwapTransactions = await createSignedSwapTransactions(
          swapTransactions
        );
      } catch (error) {
        setStep(START_STEP);
        toast.error((error as Error).message);
        return;
      }
      setSignedSwapTransactions(signedSwapTransactions);
      setStep(CREATED_TRANSACTIONS_STEP);
      toast.success("Swap transactions created successfully!");
    } catch (error) {
      setStep(START_STEP);
      toast.error("Failed to create swap transactions.");
    }
  };

  const createShareTransaction = async () => {
    try {
      if (connectionState.walletAddress === "") {
        toast.info("Please connect your wallet!");
        return;
      }
      if (signedSwapTransactions === null) {
        toast.info("Please create swap transactions first.");
        return;
      }
      setStep(LOADING_STEP);
      try {
        var txIds = await createSignedPaymentTransaction(
          connectionState.walletAddress,
          SHARE_TRANSACTION_RECEIVER_ADDRESS,
          0,
          signedSwapTransactions
        );
        setShareTransactionIds(txIds);
      } catch (error) {
        setStep(CREATED_TRANSACTIONS_STEP);
        toast.error((error as Error).message);
        return;
      }
      toast.success(
        "Created successfully. You can share the transaction ID or claim page link with the recipient."
      );
      setStep(COMPLETED_STEP);
    } catch (error) {
      setStep(CREATED_TRANSACTIONS_STEP);
      toast.error("Failed to create share transaction.");
    }
  };

  return (
    <main className="px-4 pb-16 sm:px-6 pt-2 mx-auto">
      <h1 className="text-4xl font-semibold text-primary-gray px-4 text-center py-2">
        Create Swap
      </h1>
      <p className="text-sm text-primary-gray px-4 text-center py-1">
        Add two or more (up to {MAX_SWAP_TRANSACTIONS} total) transactions.
      </p>
      <p className="text-sm text-primary-gray px-4 text-center md:w-2/3 mx-auto">
        On Algorand, atomic transfers are implemented as irreducible batch
        operations, where a group of transactions are submitted as a unit and
        all transactions in the batch either pass or fail.
      </p>
      <p className="text-sm text-red-400 px-4 text-center mt-1">
        Transactions may only have up to 1000 rounds between first/last valid
        round. So it's about ~45 minutes.
      </p>
      <div className="py-2 border-b w-1/2 mx-auto border-primary-gray"></div>
      <h2 className="text-2xl font-semibold text-primary-gray px-4 text-center mt-2">
        Transactions
      </h2>
      <form
        className="space-y-3 flex flex-col mx-auto p-4 rounded-lg shadow"
        id="swap-form"
      >
        {swapTransactions.map((transaction, index) => (
          <SwapTransactionComponent
            index={index}
            key={transaction.id}
            transaction={transaction}
            removeSwapTransaction={removeSwapTransaction}
            updateSwapTransaction={updateSwapTransaction}
            enteredWallets={Array.from(
              new Set(
                swapTransactions
                  .filter((t) => t.sender !== null && t.sender !== "")
                  .map((t) => t.sender as string)
                  .concat(
                    swapTransactions
                      .filter((t) => t.receiver !== null && t.receiver !== "")
                      .map((t) => t.receiver as string)
                  )
                  .concat([connectionState.walletAddress])
              )
            )}
            isClaim={false}
          />
        ))}
      </form>
      <Button
        sx={{
          backgroundColor: "#00E8EA",
          color: "black",
          ":hover": { backgroundColor: "#008182" },
          display: "flex",
          margin: "0 auto",
        }}
        disabled={
          swapTransactions.length >= MAX_SWAP_TRANSACTIONS ||
          step === LOADING_STEP ||
          step === CREATED_TRANSACTIONS_STEP ||
          step === COMPLETED_STEP
        }
        onClick={addSwapTransaction}
        variant="contained"
      >
        + Add Transaction
      </Button>
      <div className="flex justify-center py-4 border-t mt-4 w-1/2 mx-auto border-primary-gray">
        {step === LOADING_STEP ? (
          <div className="flex  justify-center items-center text-center">
            <CircularProgress color="info" size={24} sx={{ ml: 2 }} />
          </div>
        ) : step === START_STEP ? (
          <div className="flex flex-col md:w-1/2 lg:w-1/3">
            <Button
              disabled={
                swapTransactions.length < 2 ||
                swapTransactions.length > 16 ||
                connectionState.walletAddress === ""
              }
              sx={{
                backgroundColor: "#00E8EA",
                color: "black",
                ":hover": { backgroundColor: "#008182" },
              }}
              variant="contained"
              onClick={createSwapTransactions}
            >
              Create Swap Transactions
            </Button>
            <p className="text-primary-gray text-center text-sm mt-2">
              This swap will not be valid on the network until all transfers are
              signed. Transactions that will not be valid for any reason after
              signing will cause the transactions in the whole group to be
              invalid.
            </p>
          </div>
        ) : step === CREATED_TRANSACTIONS_STEP ? (
          <Button
            disabled={
              connectionState.walletAddress === "" ||
              signedSwapTransactions === null
            }
            sx={{
              backgroundColor: "#00E8EA",
              color: "black",
              ":hover": { backgroundColor: "#008182" },
            }}
            variant="contained"
            onClick={createShareTransaction}
          >
            Create Swap Share Transactions
          </Button>
        ) : step === COMPLETED_STEP ? (
          <div>
            <p className="text-primary-green text-center animate-pulse">
              Share transaction created successfully!
            </p>
            <div className="flex flex-col gap-y-2 justify-center py-4 items-center">
              <Button
                sx={{
                  color: "white",
                  width: "fit-content",
                }}
                variant="text"
                // &txid=1&txid=2&txid=3
                href={`/claim?txid=${shareTransactionIds.join("&txid=")}`}
              >
                Redirect to Claim Page
              </Button>
              <Button
                sx={{
                  color: "white",
                  width: "fit-content",
                }}
                variant="text"
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${
                      window.location.origin
                    }/claim?txid=${shareTransactionIds.join("&txid=")}`
                  );
                  toast.info("Transaction id copied to clipboard.");
                }}
              >
                Copy Claim Page Link
              </Button>
              <p className="text-primary-gray text-sm text-center">
                <span className="text-red-400 font-semibold animate-pulse">
                  WARNING
                </span>
                <br />
                If you change the url, other party cannot complete the swap
                process.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
