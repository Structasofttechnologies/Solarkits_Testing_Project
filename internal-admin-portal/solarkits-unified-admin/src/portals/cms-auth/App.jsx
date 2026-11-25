import { Routes, Route, Navigate } from "react-router-dom"
import './App.css';
import Alert from "./components/Alert";
import { Provider } from "react-redux";
import store from "./app/store"
import Verify from "./pages/Verify";
import SetPasscode from "./pages/SetPasscode";
import NotFound from "./pages/NotFound";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ChoosePanel from "./pages/ChoosePanel";
import AuthInitializer from "./components/auth/AuthInitializer";

export default function App() {
  return (
    <Provider store={store}>
      <AuthInitializer />
      <Routes>
        <Route path='/verify' element={<Verify />} />
        <Route path='/set-passcode' element={<SetPasscode />} />
        <Route path='/forgot-password' element={<ForgotPassword />} />
        <Route path='/login' element={<Login />} />
        <Route path='/choose-panel' element={<ChoosePanel />} />
        <Route path='/' element={<Navigate to="/login" replace />} />
        <Route path='/*' element={<NotFound />} />
      </Routes>
      <Alert />
    </Provider>
  )
}
