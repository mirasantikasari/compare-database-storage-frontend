import { createSlice } from '@reduxjs/toolkit';
import { DataAuthType, ResponseForgotPassword, ResponseLoginType, ResponseResetPassword } from '../types/AuthType';
import { ApiErrorResponse } from '../types/ApiError';
import { getProfile, handleActionLogin, handleActionRegister, handleForgotPassword, handleRegisterTherapist, handleResetPassword } from '../controller/authController';

interface AuthState {
    loading         : boolean,
    responseLogin   : ResponseLoginType | null,
    responseRegister: unknown,
    responseForgot  : ResponseForgotPassword | null,
    responseReset   : ResponseResetPassword | null,
    error           : ApiErrorResponse | null,
    statusCode      : number,
    profile         : DataAuthType | null,
    register        : ResponseLoginType | null
}

const initialState: AuthState = {
    loading         : false,
    responseLogin   : null,
    responseRegister: null,
    responseForgot  : null,
    responseReset   : null,
    error           : null,
    profile         : null,
    statusCode      : 0,
    register        : null
}

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers : {
        handleCleanResponse (state) {
            state.responseLogin = null
            state.error         = null
        },
        handleCleanResponseRegister (state) {
            state.register = null
        },
        handleCleanResponseForgot (state) {
            state.responseForgot = null
        },
        handleCleanResponseReset (state) {
            state.responseReset = null
        }
    },
    extraReducers: builder => {
        builder
            .addCase(handleActionLogin.pending , (state) => {
                state.loading = true
                state.error   = null
            })
            .addCase(handleActionLogin.fulfilled , (state , action) => {
                state.loading       = false
                const response      = action.payload

                state.responseLogin = response
            })
            .addCase(handleActionLogin.rejected , (state , action) => {
                state.loading = false
                state.error   = (action.payload as ApiErrorResponse) ?? { message: action.error.message ?? 'Login failed' }
            })

            .addCase(getProfile.pending , (state) => {
                state.loading = true
            })
            .addCase(getProfile.fulfilled , (state , action) => {
                state.loading       = false
                state.profile       = action.payload.data
                state.statusCode    = action.payload.status
            })
            .addCase(getProfile.rejected , (state , action) => {
                state.loading = false
                state.error   = (action.payload as ApiErrorResponse) ?? { message: action.error.message ?? 'Failed to load profile' }
            })

            .addCase(handleActionRegister.pending , (state) => {
                state.loading = true
                state.error   = null
            })
            .addCase(handleActionRegister.fulfilled , (state , action) => {
                state.loading           = false
                const response          = action.payload

                state.responseRegister  = response
            })
            .addCase(handleActionRegister.rejected , (state , action) => {
                state.loading = false
                state.error   = (action.payload as ApiErrorResponse) ?? { message: action.error.message ?? 'Registration failed' }
            })

            .addCase(handleRegisterTherapist.pending , (state) => {
                state.loading = true
                state.error   = null
            })
            .addCase(handleRegisterTherapist.fulfilled , (state , action) => {
                state.loading           = false
                const response          = action.payload

                state.responseRegister  = response
            })
            .addCase(handleRegisterTherapist.rejected , (state , action) => {
                state.loading = false
                state.error   = (action.payload as ApiErrorResponse) ?? { message: action.error.message ?? 'Registration failed' }
            })

            .addCase(handleForgotPassword.pending, (state) => {
                state.loading = true;
                state.responseForgot = null;
                state.error = null;
            })
            .addCase(handleForgotPassword.fulfilled, (state, action) => {
                state.loading = false;
                state.responseForgot = action.payload;
            })
            .addCase(handleForgotPassword.rejected, (state, action) => {
                state.loading = false;
                state.error = (action.payload as ApiErrorResponse) ?? { message: action.error.message ?? 'Request failed' };
            })

            .addCase(handleResetPassword.pending, (state) => {
                state.loading = true;
                state.responseReset = null;
                state.error = null;
            })
            .addCase(handleResetPassword.fulfilled, (state, action) => {
                state.loading = false;
                state.responseReset = action.payload;
            })
            .addCase(handleResetPassword.rejected, (state, action) => {
                state.loading = false;
                state.error = (action.payload as ApiErrorResponse) ?? { message: action.error.message ?? 'Request failed' };
            })
    }
})

export const { handleCleanResponse , handleCleanResponseRegister, handleCleanResponseForgot, handleCleanResponseReset } = authSlice.actions
export default authSlice.reducer;
