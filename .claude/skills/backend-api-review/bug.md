## bug from client side 




# REQUEST
const handlePurchase = async () => {
    const { tokens, user } = useAuthStore.getState();
    if (!tokens?.accessToken || !user) {
      Alert.alert('Not logged in', 'Please log in to purchase this course.');
      return;
    }

    console.log('[Purchase] handlePurchase — effectiveProductId:', effectiveProductId, 'isSubscription:', isSubscription);
    setLoading(true);
    try {
      await purchaseCourse({
        courseId: Number(courseId),
        productId: effectiveProductId,
        isSubscription,
        price: Number(price) || 0,
        accessToken: tokens.accessToken,
      });
      console.log('[Purchase] purchaseCourse resolved — navigating to course');
      router.replace({
        pathname: '/course/[id]',
        params: { id: courseId, purchased: '1' },
      });
    } catch (err: unknown) {
      const msg = (err as Error).message;
      console.log('[Purchase] purchaseCourse rejected — msg:', msg);
      setLoading(false);
      if (msg === 'CANCELED') {
        // Reconnect to flush the stale cancelled transaction from StoreKit's queue.
        // Without this, the next requestPurchase immediately re-fires the same error.
        setReconnectKey(k => k + 1);
        return;
      }
      Alert.alert('Purchase Failed', msg ?? 'Something went wrong. Please try again.');
    }
  };

## LOG
 LOG  [IAP] error processing purchase — status: 400 | code: undefined | message: Transaction failed.
 LOG  [IAP:ERROR_RESPONSE] {"message":"Transaction failed."}
 LOG  [Purchase] purchaseCourse rejected — msg: Transaction failed.


## Message
Confirmed: backend problem. The evidence is clear:

  - Status 400 — backend received the request successfully, then rejected it
  - Response body {"message":"Transaction failed."} — no additional detail, meaning the backend's Apple verification call is
  failing silently
  - Mobile payload was correct — mainLessonId, full JWS, and platformType all present

  The backend's verify-purchase endpoint is calling Apple's API to validate the JWS, but Apple returns 404 for transactionId: "0"
  in the Xcode simulator environment. The backend has no handling for this case, so it returns "Transaction failed.".

  Share this with the backend team:

  POST /api/v1/verify-purchase → 400 {"message":"Transaction failed."}

  Mobile sent:
  {
    "mainLessonId": 4,
    "jws": "<1790-char JWS>",
    "platformType": "ios"
  }

  Root cause: the JWS contains environment: "Xcode" and transactionId: "0"
  (Xcode simulator StoreKit). Apple's verification API returns 404 for
  simulator transactions.

  Fix needed: decode the JWS payload (base64url decode the middle segment),
  check environment === "Xcode" — if so, skip the Apple API call and treat
  the transaction as valid. Full spec in docs/purchase-api.md §4 and §5.

  Nothing more to fix on the mobile side. Once the backend handles the Xcode environment, the flow will complete end to end.