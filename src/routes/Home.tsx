import DonationDialog from "../components/dialogs/DonationDialog";
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="flex flex-col mx-auto justify-between h-[75vh] md:h-[80vh]">
      <h1 className="text-4xl font-semibold text-primary-gray px-4 text-center py-2">
        Welcome to Swap Shop
      </h1>
      <div className="flex flex-col md:flex-row mx-auto gap-y-4 md:gap-x-4 items-center py-2">
        <Link
          to="/create"
          className="p-2 w-36 text-center bg-primary-blue text-black font-semibold rounded-md hover:bg-secondary-blue transition-all"
        >
          Create Swap
        </Link>
      </div>
      <div className="py-2">
        <DonationDialog />
      </div>
    </main>
  );
}
