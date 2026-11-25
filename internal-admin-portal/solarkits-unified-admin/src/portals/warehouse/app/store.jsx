import { configureStore } from "@reduxjs/toolkit"
import alert_slice from "../features/alert.slice"
import user_slice from "../features/user.slice"
import auth_slice from "../features/auth.slice"
import modules_slice from "../features/modules.slice"
import countries_slice from "../features/countries.slice"

const store = configureStore({
    reducer: {
        alert_slice: alert_slice,
        user_slice: user_slice,
        auth: auth_slice,
        modules_slice: modules_slice,
        countries: countries_slice,
    }
})
export default store;