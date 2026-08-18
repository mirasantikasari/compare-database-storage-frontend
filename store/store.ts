import { configureStore } from "@reduxjs/toolkit";
import counterReducer from "./slices/counterSlice";
import authReducer from "./slices/authSlice";
import exampleReducer from "./slices/exampleSlice";
import storageReducer from "./slices/storageSlice";

export const store = configureStore({
  reducer: {
    counter: counterReducer,
    auth: authReducer,
    example: exampleReducer,
    storage: storageReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
