import {
  Select,
  Button,
  OutlinedInput,
  TextField,
  Autocomplete,
} from "@mui/material";
import { TRANSACTION_TYPES } from "../core/constants";
import { SwapTransaction } from "../core/types";
import { FaMinus } from "react-icons/fa";
import useConnectionStore from "../store/connectionStore";

export type SwapTransactionComponentProps = {
  transaction: SwapTransaction;
  index: number;
  removeSwapTransaction: (id: number) => void;
  updateSwapTransaction: (
    id: number,
    field: "sender" | "receiver" | "amount" | "assetId" | "txType",
    value: string | number
  ) => void;
  enteredWallets: string[] | null;
  enteredAssetIds: number[] | null;
  isClaim: boolean;
};

export default function SwapTransactionComponent({
  transaction,
  index,
  removeSwapTransaction,
  updateSwapTransaction,
  enteredWallets,
  isClaim,
  enteredAssetIds,
}: SwapTransactionComponentProps) {
  const connection = useConnectionStore((state) => state);

  return (
    <div
      key={transaction.id}
      className="flex flex-col w-full md:w-1/2 lg:w-1/3 p-6 border-2 border-primary-blue rounded-md mx-auto"
    >
      <div className="flex items-center space-x-2 justify-between">
        <span className="font-semibold text-white text-xl">{index + 1}</span>
        {!isClaim && (
          <Button
            variant="contained"
            sx={{
              color: "white",
              borderColor: "#EF4444",
              backgroundColor: "#EF4444",
              ":hover": { backgroundColor: "#d21212" },
              py: 1,
            }}
            onClick={() => removeSwapTransaction(transaction.id)}
          >
            <FaMinus />
          </Button>
        )}
      </div>
      <Select
        id={`type-${transaction.id}`}
        native
        input={<OutlinedInput />}
        sx={{
          height: "3rem",
          color: "white",
          fontWeight: "bold",
          fontSize: "1rem",
          mt: 2,
          mb: 1,
        }}
        inputProps={{ "aria-label": "Without label" }}
        label="Select Transaction Type"
        value={transaction.txType || ""}
        onChange={(e) => {
          updateSwapTransaction(transaction.id, "txType", e.target.value);
        }}
        disabled={isClaim}
      >
        <option aria-label="None" value="">
          Select Transaction Type
        </option>
        {TRANSACTION_TYPES.map((txType) => (
          <option key={txType.type} value={txType.type}>
            {txType.label}
          </option>
        ))}
      </Select>
      <div className="grid grid-rows md:grid-cols-2 gap-2 mb-2">
        <Autocomplete
          freeSolo
          id={`sender-${transaction.id}`}
          options={enteredWallets || []}
          value={transaction.sender || null}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Sender Address or NFD"
              onChange={(e) =>
                updateSwapTransaction(transaction.id, "sender", e.target.value)
              }
            />
          )}
          onInputChange={(e, value) => {
            updateSwapTransaction(transaction.id, "sender", value);
          }}
          disabled={isClaim}
        />
        {transaction.txType !== "optin" && (
          <Autocomplete
            freeSolo
            id={`receiver-${transaction.id}`}
            options={enteredWallets || []}
            value={transaction.receiver || null}
            renderInput={(params) => (
              <TextField
                {...params}
                placeholder="Receiver Address or NFD"
                onChange={(e) =>
                  updateSwapTransaction(
                    transaction.id,
                    "receiver",
                    e.target.value
                  )
                }
              />
            )}
            onInputChange={(e, value) => {
              updateSwapTransaction(transaction.id, "receiver", value);
            }}
            disabled={isClaim}
          />
        )}
        <Autocomplete
          freeSolo
          id={`assetId-${transaction.id}`}
          options={enteredAssetIds || []}
          value={transaction.assetId === 1 ? "" : transaction.assetId || ""}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder={transaction.txType === "pay" ? "ALGO" : "Asset Id"}
              type="number"
              onChange={(e) =>
                updateSwapTransaction(
                  transaction.id,
                  "assetId",
                  Number(e.target.value)
                )
              }
            />
          )}
          onInputChange={(e, value) => {
            updateSwapTransaction(transaction.id, "assetId", Number(value));
          }}
          disabled={transaction.txType === "pay" || isClaim}
        />
        {transaction.txType !== "optin" && (
          <TextField
            id={`amount-${transaction.id}`}
            placeholder="Amount"
            type="number"
            value={transaction.amount || ""}
            onChange={(e) => {
              if (Number(e.target.value) >= 0) {
                updateSwapTransaction(transaction.id, "amount", e.target.value);
              }
            }}
            disabled={isClaim}
          />
        )}
      </div>
      {connection &&
        connection.walletAddress &&
        (connection.walletAddress === transaction.sender ||
        (connection.nfdomain && connection.nfdomain === transaction.sender) ? (
          <p className="text-primary-gray text-center text-xs">
            You're the <b>SENDER</b> of this transaction.
          </p>
        ) : connection.walletAddress === transaction.receiver ||
          (connection.nfdomain &&
            connection.nfdomain === transaction.receiver) ? (
          <p className="text-primary-gray text-center text-xs">
            You're the <b>RECEIVER</b> of this transaction.
          </p>
        ) : null)}
    </div>
  );
}
