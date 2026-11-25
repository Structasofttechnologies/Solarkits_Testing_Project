import { Route, Routes } from "react-router-dom";
import ActiveCountries from "./setup-location/ActiveCountries";
import ActiveStates from "./setup-location/ActiveState";
import ActiveDistricts from "./setup-location/ActiveDistricts";
import UrbanCities from "./setup-location/UrbanCities";
import RuralCities from "./setup-location/RuralCities";
export default function SetupLocation({ moduleUniqueId }) {
  return (
      <Routes>
        <Route path="/" element={<ActiveCountries moduleUniqueId={moduleUniqueId} />} />
        <Route path="/active-states" element={<ActiveStates moduleUniqueId={moduleUniqueId} />} />
        <Route path="/active-districts" element={<ActiveDistricts moduleUniqueId={moduleUniqueId} />} />
        <Route path="/urban-cities" element={<UrbanCities moduleUniqueId={moduleUniqueId} />} />
        <Route path="/rural-cities" element={<RuralCities moduleUniqueId={moduleUniqueId} />} />
      </Routes>
  );
}
