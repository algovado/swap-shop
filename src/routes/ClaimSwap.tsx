import { Link, useLocation } from "react-router-dom";
import {
  getSwapTransactionsFromNotes,
  getTransactionData,
  signTransactions,
  sendSignedTransaction,
  decodeTransactionv2,
  mergeSignedTransactions,
} from "../core/utils";
import { useEffect, useMemo, useState } from "react";
import { SwapTransaction } from "../core/types";
import SwapTransactionComponent from "../components/SwapTransactionComponent";
import { Button, CircularProgress } from "@mui/material";
import { toast } from "react-toastify";
import useConnectionStore from "../store/connectionStore";
import parseClientError, {
  AlgoClientError,
} from "../core/parseNodeClientError";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const LOADING_STEP = 0;
const START_STEP = 1;
const SIGNED_TRANSACTIONS_STEP = 2;
const COMPLETED_STEP = 3;
const PAGE_LOADING = 4;

export default function ClaimSwap() {
  const connectionState = useConnectionStore((state) => state);
  const [step, setStep] = useState(PAGE_LOADING);
  const query = useQuery();
  const txIds = query.getAll("txid");
  const [shareTransactions, setShareTransactions] = useState(
    [] as {
      swapTransaction: SwapTransaction;
      isSigned: boolean;
      transactionBytes: Uint8Array;
    }[]
  );
  const [signedTransactions, setSignedTransactions] = useState(
    [] as Uint8Array[]
  );
  const [sendError, setSendError] = useState("");

  useEffect(() => {
    if (txIds.length === 0) {
      setStep(START_STEP);
      return;
    }
    async function fetchTransactionData() {
      var transactions = [];
      for (let txId of txIds) {
        const transactionData = await getTransactionData(txId);
        if (transactionData === null) {
          setStep(START_STEP);
          return;
        }
        transactions.push(transactionData);
      }
      const swapTransactions = await getSwapTransactionsFromNotes(
        transactions.map((tx) => tx.transaction)
      );
      setShareTransactions(swapTransactions);
      setStep(START_STEP);
    }
    fetchTransactionData();
  }, []);

  const signSwapTransactions = async () => {
    try {
      if (shareTransactions.length === 0) {
        toast.error("No transactions found");
        return;
      }
      if (connectionState.walletAddress === "") {
        toast.info("Please connect your wallet!");
        return;
      }
      setStep(LOADING_STEP);
      const signedTransactions = await signTransactions(
        shareTransactions.map((tx) => decodeTransactionv2(tx.transactionBytes)),
        connectionState.walletAddress
      );
      const mergedTxns = mergeSignedTransactions(
        signedTransactions,
        shareTransactions.map((tx) => tx.transactionBytes)
      );
      setSignedTransactions(mergedTxns);
      setStep(SIGNED_TRANSACTIONS_STEP);
      toast.success("Transactions signed successfully");
    } catch (error) {
      console.error(error);
      toast.error("Error signing transactions");
      setStep(SIGNED_TRANSACTIONS_STEP);
    }
  };

  const sendTransactions = async () => {
    try {
      if (signedTransactions.length === 0) {
        toast.error("No signed transactions found");
        return;
      }
      setStep(LOADING_STEP);
      await sendSignedTransaction(signedTransactions);
      setStep(COMPLETED_STEP);
    } catch (error) {
      const parsedError = parseClientError(error as AlgoClientError);
      toast.error("Transaction failed. Plese check the error.");
      setSendError(parsedError.message);
      setStep(SIGNED_TRANSACTIONS_STEP);
    }
  };

  if (step === PAGE_LOADING) {
    return (
      <main className="flex flex-col text-center justify-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full">
        <img
          src="/images/loading.gif"
          alt="loading"
          className="w-64 h-64 mx-auto"
        />
        <h2 className="text-2xl font-bold mt-4 text-primary-gray">
          Loading...
        </h2>
      </main>
    );
  }

  if (
    txIds.length === 0 ||
    !shareTransactions ||
    shareTransactions.length === 0
  ) {
    return (
      <main className="flex flex-col mx-auto justify-between h-[75vh] md:h-[80vh] text-center">
        <h1 className="text-4xl font-semibold text-primary-gray px-4 py-2">
          Claim Swap
        </h1>
        <p className="text-primary-gray text-lg mt-32">
          Transactions not found. Please check URL and network type.
        </p>
        <Link
          to="/"
          className="text-xl text-primary-green hover:underline mt-64 transition-colors"
        >
          Go to Home
        </Link>
      </main>
    );
  }

  return (
    <main className="px-4 pb-16 sm:px-6 pt-2 text-center">
      <h1 className="text-4xl font-semibold text-primary-gray px-4 text-center py-2">
        Claim Swap
      </h1>
      <h2 className="text-2xl font-semibold text-primary-gray px-4 text-center mt-2">
        Transactions
      </h2>
      <div className="space-y-3 flex flex-col mx-auto p-4 rounded-lg shadow">
        {shareTransactions.map((transaction, index) => (
          <SwapTransactionComponent
            index={index}
            key={transaction.swapTransaction.id}
            transaction={transaction.swapTransaction}
            enteredWallets={[]}
            enteredAssetIds={[]}
            removeSwapTransaction={() => {}}
            updateSwapTransaction={() => {}}
            isClaim={true}
          />
        ))}
      </div>
      <div className="flex flex-col">
        <div className="flex justify-center py-4 border-t mt-4 w-1/2 mx-auto border-primary-gray">
          {step === LOADING_STEP ? (
            <Button>
              <CircularProgress color="info" size={24} sx={{ ml: 2 }} />
            </Button>
          ) : step === START_STEP ? (
            <div className="flex flex-col md:w-1/2 lg:w-1/3">
              <Button
                disabled={connectionState.walletAddress === ""}
                sx={{
                  backgroundColor: "#00E8EA",
                  color: "black",
                  ":hover": { backgroundColor: "#008182" },
                }}
                variant="contained"
                onClick={signSwapTransactions}
              >
                Sign Swap Transactions
              </Button>
              <p className="text-primary-gray text-center text-sm mt-2">
                This swap will not be valid on the network until all transfers
                are signed. Transactions that will not be valid for any reason
                after signing will cause the transactions in the whole group to
                be invalid.
              </p>
            </div>
          ) : step === SIGNED_TRANSACTIONS_STEP ? (
            <Button
              disabled={
                connectionState.walletAddress === "" ||
                signedTransactions.length === 0 ||
                sendError !== ""
              }
              sx={{
                backgroundColor: "#00E8EA",
                color: "black",
                ":hover": { backgroundColor: "#008182" },
              }}
              variant="contained"
              onClick={sendTransactions}
            >
              Send Transactions
            </Button>
          ) : step === COMPLETED_STEP && sendError === "" ? (
            <>
              <div className="text-primary-green text-center animate-pulse">
                Transactions sent successfully.
              </div>
            </>
          ) : null}
        </div>
        {sendError !== "" && (
          <div className="text-red-400 text-center text-base border-2 border-red-400 w-1/2 mx-auto p-4 rounded-md">
            <span className="text-primary-gray">SWAP FAILED</span>
            <br />
            <p className="mx-auto ax-w-64 text-center">{sendError}</p>
            <br />
            <span className="text-primary-gray">
              Please check the error and try again if you fixed the issue.
            </span>
          </div>
        )}
      </div>
    </main>
  );
}
