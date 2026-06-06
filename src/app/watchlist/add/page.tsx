import { AddItemForm } from "@/components/AddItemForm";
import { AppFrame } from "@/components/AppFrame";

export default function AddPage() {
  return (
    <AppFrame>
      <div className="page-title">
        <div>
          <h1>Add</h1>
          <p>Search TMDb, pick the exact movie or series, then save the personal note.</p>
        </div>
      </div>
      <AddItemForm />
    </AppFrame>
  );
}
