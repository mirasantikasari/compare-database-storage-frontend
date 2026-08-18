This is a [Next.js](https://nextjs.org) app template, bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app) and extended with a standard Redux Toolkit + Axios architecture.

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

Set your backend URL in `.env.local`:

```bash
NEXT_PUBLIC_API_URL=https://your-api.example.com
```

## Folder Structure

```
app/         Routes (Next.js App Router). One folder per route, e.g. app/sign-in/page.tsx
hooks/       Reusable React hooks (useAppDispatch/useAppSelector, useNavigate, ...)
layouts/     Page shells that wrap routes (e.g. AppLayout)
services/    Shared API clients (axios instance with auth header injection)
store/       Redux Toolkit state
  controller/  createAsyncThunk API calls, grouped by domain
  slices/      createSlice reducers + extraReducers wired to controllers
  types/       Request/response and shared types (e.g. ApiErrorResponse)
  store.ts     configureStore, combines all slices
  StoreProvider.tsx  Client component wrapping <Provider store={store}>
```

Adding a new domain (e.g. "product") means adding:
`store/types/ProductType.ts` → `store/controller/productController.ts` → `store/slices/productSlice.ts`, then registering the reducer in `store/store.ts`.

## Redux data flow

Each domain follows the same pattern, using `auth` as the reference:

1. **Controller** (`store/controller/authController.ts`) — a `createAsyncThunk` per API call. Every thunk wraps its request in try/catch and calls `rejectWithValue(error.response?.data ?? { message: error.message })` on failure, so the real API error body reaches the slice instead of getting swallowed.
2. **Slice** (`store/slices/authSlice.ts`) — `extraReducers` handles `.pending` / `.fulfilled` / `.rejected` for each thunk, setting `loading` and `error` accordingly.
3. **Page** (`app/**/page.tsx`) — reads state with `useAppSelector`, dispatches thunks with `useAppDispatch` (both from `hooks/useStore.ts`), and renders the `error.message` when present.

## Examples included

- **`app/sign-in/page.tsx`** — login form wired to `handleActionLogin`, stores the returned token in `localStorage`, redirects on success, shows the API error message on failure.
- **`app/example/page.tsx`** — GET and POST round trip against the public [JSONPlaceholder](https://jsonplaceholder.typicode.com) API via `store/controller/exampleController.ts`, demonstrating loading states and error display. Replace `exampleApi`'s baseURL with your own `services/api.ts` instance once you have a real endpoint.

## Auth

- `services/api.ts` attaches `Authorization: Bearer <token>` from `localStorage["auth-key"]` to every request.
- `layouts/AppLayout.tsx` fetches the current profile (`getProfile`) on mount when `checkAuth` is true and an `auth-key` exists. Pass `checkAuth={false}` for public pages (sign-in, sign-up, etc.).

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org)
