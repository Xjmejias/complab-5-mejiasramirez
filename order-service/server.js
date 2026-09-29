const express = require("express");
const amqp = require("amqplib");
const crypto = require("crypto");

const app = express();

app.use(express.json());

const PORT = 4001;

const RABBITMQ_URL =
    process.env.RABBITMQ_URL ||
    "amqp://guest:guest@rabbitmq:5672";

const EXCHANGE = "orders";

let channel;


async function connectRabbitMQ() {

    while (!channel) {

        try {

            const connection =
                await amqp.connect(RABBITMQ_URL);

            channel =
                await connection.createChannel();

            await channel.assertExchange(
                EXCHANGE,
                "topic",
                {
                    durable: true
                }
            );

            console.log("Connected to RabbitMQ");

        } catch (error) {

            console.log(
                "RabbitMQ not ready. Retrying..."
            );

            await new Promise(
                resolve => setTimeout(resolve, 5000)
            );
        }
    }
}


app.get("/", (req, res) => {

    res.json({
        message: "Order Service is running"
    });

});


app.post("/orders", async (req, res) => {

    try {

        const {
            product,
            amount
        } = req.body;

        if (!product || !amount) {

            return res.status(400).json({
                error: "Product and amount are required"
            });

        }

        const orderId =
            crypto.randomUUID();

        const order = {

            orderId,

            product,

            amount,

            status: "PLACED",

            createdAt:
                new Date().toISOString()

        };


        channel.publish(

            EXCHANGE,

            "order.placed",

            Buffer.from(
                JSON.stringify(order)
            ),

            {
                persistent: true
            }

        );


        console.log(
            "Published order.placed:",
            order
        );


        res.status(201).json({

            message: "Order placed",

            orderId,

            order

        });

    } catch (error) {

        console.error(error);

        res.status(500).json({
            error: "Failed to place order"
        });

    }

});


connectRabbitMQ();

app.listen(PORT, () => {

    console.log(
        `Order Service running on port ${PORT}`
    );

});
