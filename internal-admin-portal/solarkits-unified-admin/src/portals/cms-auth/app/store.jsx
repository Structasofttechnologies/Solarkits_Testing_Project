import { configureStore } from "@reduxjs/toolkit"
import alert_slice from "../features/alert.slice"
import countries_slice from "../features/countries.slice"
import auth_slice from "../features/auth.slice"
const store = configureStore({
    reducer: {
        alert_slice: alert_slice,
        auth: auth_slice,
        countries: countries_slice,
    }
})
export default store;