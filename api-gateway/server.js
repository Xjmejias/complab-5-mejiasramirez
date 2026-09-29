const express = require("express");

const app = express();

app.use(express.json());

const PORT = 4000;

const ORDER_SERVICE_URL =
    process.env.ORDER_SERVICE_URL || "http://order-service:4001";

const PAYMENT_SERVICE_URL =
    process.env.PAYMENT_SERVICE_URL || "http://payment-service:4002";


app.get("/", (req, res) => {

    res.json({
        message: "API Gateway is running"
    });

});


app.post("/orders", async (req, res) => {

    try {

        const response = await fetch(
            `${ORDER_SERVICE_URL}/orders`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(req.body)
            }
        );

        const data = await response.json();

        res.status(response.status).json(data);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Order service unavailable"
        });

    }

});


app.get("/payments", async (req, res) => {

    try {

        const response = await fetch(
            `${PAYMENT_SERVICE_URL}/payments`
        );

        const data = await response.json();

        res.status(response.status).json(data);

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Payment service unavailable"
        });

    }

});


app.listen(PORT, () => {

    console.log(
        `API Gateway running on port ${PORT}`
    );

});
