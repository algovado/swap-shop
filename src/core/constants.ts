import useConnectionStore from "../store/connectionStore";

// NODE
const MAINNET_ALGONODE_NODE = "https://mainnet-api.algonode.cloud";
const TESTNET_ALGONODE_NODE = "https://testnet-api.algonode.cloud";

// INDEXER
const MAINNET_ALGONODE_INDEXER = "https://mainnet-idx.algonode.cloud";
const TESTNET_ALGONODE_INDEXER = "https://testnet-idx.algonode.cloud";

export const NODE_URL =
  useConnectionStore.getState().networkType === "mainnet"
    ? MAINNET_ALGONODE_NODE
    : TESTNET_ALGONODE_NODE;
export const INDEXER_URL =
  useConnectionStore.getState().networkType === "mainnet"
    ? MAINNET_ALGONODE_INDEXER
    : TESTNET_ALGONODE_INDEXER;

export const IPFS_ENDPOINT = "https://ipfs.algonode.xyz/ipfs";

export const TX_NOTE = "via Swap Shop";
