import useConnectionStore from "../store/connectionStore";
import DonationDialog from "../components/dialogs/DonationDialog";

export default function Home() {
  // ** Store states
  const connectionState = useConnectionStore((state) => state);

  if (!connectionState.walletAddress) {
    return (
      <main className="flex flex-col text-center justify-center absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full">
        <h1 className="text-4xl font-semibold text-primary-gray">
          Welcome to Swap Shop
        </h1>
        <DonationDialog />
      </main>
    );
  }

  return (
    <main className="px-4 pb-8 sm:px-6 pt-2">
      <DonationDialog />
    </main>
  );
}
