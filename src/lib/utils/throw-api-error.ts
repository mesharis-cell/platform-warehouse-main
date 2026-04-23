/**
 * Normalise an API error into a thrown Error carrying:
 *   - a readable `.message` pulled from the API's response body (so UI
 *     toasts / form errors show "Pickup window too soon" instead of
 *     axios' generic "Request failed with status code 400")
 *   - the original axios `.response` preserved on the thrown Error, so
 *     callers that need to read structured payloads (e.g. the pooled
 *     settlement modal reading `error.response.data.requires_settlement`)
 *     can still get at them.
 *
 * Previously this function created a plain `new Error(message)` and lost
 * every field except `.message` — which silently broke any feature that
 * depended on the API returning structured error data. 2026-04-23 hotfix
 * after the pooled settlement modal failed to pop on warehouse inbound
 * scans despite the API correctly returning `requires_settlement`.
 */
export const throwApiError = (error: Error | unknown) => {
    let errorMessage = "Unknown error";
    let response: unknown = undefined;

    if (error instanceof Error) {
        const axiosError = error as {
            response?: { data?: { message?: string } };
            message?: string;
        };
        errorMessage = axiosError.response?.data?.message || error.message;
        response = axiosError.response;
    }
    const err = new Error(errorMessage);
    // Attach response so callers can read structured payloads off the
    // error without reaching into axios-specific shapes.
    (err as Error & { response?: unknown }).response = response;
    throw err;
};
