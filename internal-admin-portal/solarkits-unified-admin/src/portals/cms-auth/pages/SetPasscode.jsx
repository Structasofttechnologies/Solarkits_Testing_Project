// SetPasscode.jsx (updated)
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import OTPInput from "../components/OTPInput";
import axios from "axios";
import { useDispatch } from "react-redux";
import { setAlert } from "../features/alert.slice";
import AuthLayout from "../components/auth/AuthLayout";
import Button from "../components/Button";
import { HiLockClosed, HiCheckCircle, HiExclamationCircle, HiInformationCircle, HiShieldCheck, HiArrowLeft } from "react-icons/hi2";

export default function SetPasscode() {
    const [passcode, setPasscode] = useState("");
    const [confirmPasscode, setConfirmPasscode] = useState("");
    const [loading, setLoading] = useState(false);
    const [token, setToken] = useState(null);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        const storedTokenData = localStorage.getItem('passcodeToken');
        if (!storedTokenData) {
            navigate('/verify', { replace: true });
            return;
        }
        setToken(JSON.parse(storedTokenData)?.token);
    }, [navigate]);

    const setNewPasscode = async (e) => {
        e.preventDefault();
        
        if (passcode.length !== 4) {
            return dispatch(setAlert({ message: "Passcode must be exactly 4 digits", type: 'error' }));
        }
        
        if (passcode !== confirmPasscode) {
            return dispatch(setAlert({ message: "Passcodes do not match", type: 'error' }));
        }
        
        try {
            setLoading(true);
            const res = await axios.post(`${import.meta.env.VITE_AUTH_API_URL || import.meta.env.VITE_API_URL}/set-passcode`, { 
                token, 
                passcode, 
                confirm_passcode: confirmPasscode 
            });
            
            const { status, message } = res.data;
            dispatch(setAlert({ message, type: status }));
            localStorage.removeItem('passcodeToken');
            
            setTimeout(() => {
                navigate('/login');
            }, 1500);
            
        } catch (error) {
            let message = 'Something went wrong. Please try again.';
            if (error.response) {
                message = error.response.data?.message || `Error: ${error.response.statusText}`;
                if (error.response.status === 401) {
                    localStorage.removeItem('passcodeToken');
                    dispatch(setAlert({ message, type: 'error' }));
                    navigate(-1);
                    return;
                }
            } else if (error.request) {
                message = 'No response from server. Please check your internet connection.';
            } else {
                message = error.message || 'Unexpected error occurred.';
            }
            dispatch(setAlert({ message, type: 'error' }));
        } finally {
            setLoading(false);
        }
    };

    const passcodesMatch = passcode.length === 4 && confirmPasscode.length === 4 && passcode === confirmPasscode;
    const showMatchError = confirmPasscode.length === 4 && passcode !== confirmPasscode;

    return (
        <AuthLayout
            title="Secure Your Account"
            subtitle="Set up a secure 4-digit passcode to protect your account and data"
            footerText="Remember your passcode?"
            footerLink="/login"
            footerLinkText="Sign In"
        >
            <form onSubmit={setNewPasscode} className="space-y-4">
                {/* Header */}
                <div className="text-center mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                        <HiLockClosed className="w-6 h-6 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-text-primary mb-1">
                        Create Secure Passcode
                    </h2>
                    <p className="text-text-secondary text-sm">
                        Enter and confirm your 4-digit security passcode
                    </p>
                </div>

                {/* New Passcode Input */}
                <div className="space-y-3">
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-text-primary">
                                New Passcode
                            </label>
                            <span className="text-xs text-text-muted">
                                4 digits required
                            </span>
                        </div>
                        <OTPInput 
                            length={4} 
                            onChange={setPasscode}
                            disabled={loading}
                            className="justify-center"
                            autoFocus={true}
                        />
                        {passcode.length === 4 && (
                            <p className="text-xs text-success mt-1 flex items-center gap-1">
                                <HiCheckCircle className="w-3 h-3" />
                                Passcode entered
                            </p>
                        )}
                    </div>

                    {/* Confirm Passcode Input */}
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-text-primary">
                                Confirm Passcode
                            </label>
                            <span className="text-xs text-text-muted">
                                Must match
                            </span>
                        </div>
                        <OTPInput 
                            length={4} 
                            onChange={setConfirmPasscode}
                            disabled={loading}
                            className="justify-center"
                        />
                        
                        {showMatchError && (
                            <p className="text-xs text-danger mt-1 flex items-center gap-1">
                                <HiExclamationCircle className="w-3 h-3" />
                                Passcodes do not match
                            </p>
                        )}
                        
                        {passcodesMatch && (
                            <p className="text-xs text-success mt-1 flex items-center gap-1">
                                <HiCheckCircle className="w-3 h-3" />
                                Passcodes match! You're ready to proceed
                            </p>
                        )}
                    </div>
                </div>

                {/* Passcode Tips */}
                <div className="bg-surface-hover rounded-lg p-3 border border-border">
                    <h3 className="text-sm font-semibold text-text-primary mb-2 flex items-center gap-2">
                        <HiInformationCircle className="w-4 h-4 text-primary" />
                        Passcode Tips
                    </h3>
                    <ul className="text-xs text-text-secondary space-y-1">
                        <li className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>Easy to remember but hard to guess</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>Avoid sequences like 1234 or 0000</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-primary mt-0.5">•</span>
                            <span>Don't use personal information</span>
                        </li>
                    </ul>
                </div>

                {/* Submit Button */}
                <Button
                    type="submit"
                    loading={loading}
                    disabled={!passcodesMatch}
                    fullWidth
                    size="lg"
                    leftIcon={!loading && (
                        <HiShieldCheck className="w-4 h-4" />
                    )}
                >
                    {loading ? 'Securing Account...' : 'Set Secure Passcode'}
                </Button>

                {/* Divider */}
                <div className="relative my-4">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-3 bg-surface text-text-muted text-xs">
                            Already have an account?
                        </span>
                    </div>
                </div>

                {/* Back to Login */}
                <div className="text-center">
                    <Link
                        to="/login"
                        className="inline-flex items-center gap-2 text-primary hover:text-primary-hover font-medium transition-colors group text-sm"
                    >
                        <HiArrowLeft className="w-3 h-3 transform group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Sign In</span>
                    </Link>
                </div>
            </form>
        </AuthLayout>
    );
}