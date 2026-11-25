import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth_slice);
  return isAuthenticated ? children : <Navigate to="/auth/login" />;
};
export default ProtectedRoute;