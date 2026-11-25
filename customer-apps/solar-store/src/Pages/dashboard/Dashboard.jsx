import { Route, Routes } from "react-router-dom";
import { useSelector } from "react-redux";
import ProjectSignupsStatus from "./ProjectSignupsStatus";
import ProjectOrderStatus from "./ProjectOrderStatus";
import EpcCatalogue from "./EpcCatalogue";
import PreconfiguredComboKit from "./PreconfiguredComboKit";

export default function Dashboard() {
  return (
    <Routes>
      <Route index element={<PreconfiguredComboKit />} />
      <Route path="/catalogue" element={<EpcCatalogue />} />
      <Route path="/signup-status" element={<ProjectSignupsStatus />} />
      <Route path="/order-status" element={<ProjectOrderStatus />} />
      <Route path="*" element={<PreconfiguredComboKit />} />
    </Routes>
  );
}
