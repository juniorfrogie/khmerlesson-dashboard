import { Router } from "express"
import {
    ApiError,
    CheckoutPaymentIntent,
    PaypalWalletContextShippingPreference,
    PaypalExperienceLandingPage,
    PaypalExperienceUserAction,
    PayeePaymentMethodPreference,
    Client,
    Environment,
    LogLevel,
    OrdersController,
    PaymentsController,
} from "@paypal/paypal-server-sdk";
import dotEnv from "dotenv"

dotEnv.config()
const router = Router()

const {
    PAYPAL_CLIENT_ID,
    PAYPAL_CLIENT_SECRET,
} = process.env;

const client = new Client({
    clientCredentialsAuthCredentials: {
        oAuthClientId: PAYPAL_CLIENT_ID ?? "",
        oAuthClientSecret: PAYPAL_CLIENT_SECRET ?? ""
    },
    timeout: 0,
    environment: Environment.Sandbox,
    logging: {
        logLevel: LogLevel.Info,
        logRequest: { logBody: true },
        logResponse: { logHeaders: true },
    },
});

const ordersController = new OrdersController(client);
const paymentsController = new PaymentsController(client);

/**
 * Create an order to start the transaction.
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_create
 */
const createOrder = async (req: any, purchaseUnits: any) => {
   const collect = {
        body: {
            intent: CheckoutPaymentIntent.Capture,
            paymentSource: {
                paypal: {
                    experienceContext: {
                        paymentMethodPreference: PayeePaymentMethodPreference.ImmediatePaymentRequired,
                        landingPage: PaypalExperienceLandingPage.Login,
                        shippingPreference: PaypalWalletContextShippingPreference.NoShipping,
                        userAction: PaypalExperienceUserAction.PayNow,
                        returnUrl: `${req.protocol}://${req.get('host')}/complete`,
                        cancelUrl: `${req.protocol}://${req.get('host')}/cancel`
                    }
                }
            },
            purchaseUnits
        }
    };
   
    try {
        const { body, ...httpResponse } = await ordersController.createOrder(
            collect
        );
        // Get more response info...
        // const { statusCode, headers } = httpResponse;
        // const oAuthToken = await client.clientCredentialsAuthManager.fetchToken()
        // console.log(oAuthToken.accessToken)
        return {
            jsonResponse: JSON.parse(body.toString()),
            httpStatusCode: httpResponse.statusCode
        };
    } catch (error) {
        if (error instanceof ApiError) {
            // const { statusCode, headers } = error;
            throw new Error(error.message);
        }
    }
};

// createOrder route
router.post("/orders", async (req, res) => {
    try {
        // use the cart information passed from the front-end to calculate the order amount detals
        const { purchaseUnits } = req.body;
        const response = await createOrder(req, purchaseUnits);
        if(!response) throw new Error("Failed to create order.");
        res.status(response.httpStatusCode).json(response.jsonResponse);
    } catch (error) {
        console.error("Failed to create order:", error);
        res.status(500).json({ error: "Failed to create order." });
    }
});

/**
 * Capture payment for the created order to complete the transaction.
 * @see https://developer.paypal.com/docs/api/orders/v2/#orders_capture
 */
const captureOrder = async (orderID: string) => {
    const collect = {
        id: orderID,
        // prefer: "return=minimal"
    };

    try {
        const { body, ...httpResponse } = await ordersController.captureOrder(
            collect
        );
        // Get more response info...
        // const { statusCode, headers } = httpResponse;
        return {
            jsonResponse: JSON.parse(body.toString()),
            httpStatusCode: httpResponse.statusCode
        };
    } catch (error) {
        if (error instanceof ApiError) {
            // const { statusCode, headers } = error;
            throw new Error(error.message);
        }
    }
};

router.post("/orders/:orderID/capture", async (req, res) => {
    try {
        const { orderID } = req.params;
        const response = await captureOrder(orderID);
        if(!response) throw new Error("Failed to capture order.");
        res.status(response.httpStatusCode).json(response.jsonResponse);
    } catch (error) {
        console.error("Failed to capture order:", error);
        res.status(500).json({ error: "Failed to capture order." });
    }
})

const refundCapturedPayment = async (orderID: string) => {
    try {
        const { body, ...httpResponse } = await paymentsController.refundCapturedPayment({
            captureId: orderID
        });
        // Get more response info...
        // const { statusCode, headers } = httpResponse;
        return {
            jsonResponse: JSON.parse(body.toString()),
            httpStatusCode: httpResponse.statusCode
        };
    } catch (error) {
        if (error instanceof ApiError) {
            // const { statusCode, headers } = error;
            throw new Error(error.message);
        }
    }
};

router.post("/payments/captures/:orderID/refund", async (req, res) => {
    try {
        const { orderID } = req.params;
        const response = await refundCapturedPayment(orderID)
        if(!response) throw new Error("Failed to refund payment.");
        res.status(response.httpStatusCode).json(response.jsonResponse);
    } catch (error) {
        console.error("Failed to refund payment:", error);
        res.status(500).send("Failed to refund payment.");
    }
})

export default router;