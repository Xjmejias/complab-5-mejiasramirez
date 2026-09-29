const express = require("express");
const amqp = require("amqplib");

const app = express();

app.use(express.json());

const PORT = 4004;

const RABBITMQ_URL =
    process.env.RABBITMQ_URL ||
    "amqp://guest:guest@rabbitmq:5672";

const EXCHANGE = "orders";

async function connectRabbitMQ() {

    while (true) {

        try {

            const connection =
                await amqp.connect(RABBITMQ_URL);

            const channel =
                await connection.createChannel();

            await channel.assertExchange(
                EXCHANGE,
                "topic",
                {
                    durable: true
                }
            );

            const queue =
                await channel.assertQueue(
                    "notification-service",
                    {
                        durable: true
                    }
                );

            await channel.bindQueue(
                queue.queue,
                EXCHANGE,
                "payment.success"
            );

            console.log(
                "Notification Service connected to RabbitMQ"
            );

            channel.consume(
                queue.queue,
                (message) => {

                    if (!message) {
                        return;
                    }

                    const payment =
                        JSON.parse(
                            message.content.toString()
                        );

                    console.log(
                        "Payment successful!"
                    );

                    console.log(
                        `Order ${payment.orderId} payment successful.`
                    );

                    channel.ack(message);
                }
            );

            break;

        } catch (error) {

            console.log(
                "RabbitMQ not ready. Retrying in 5 seconds..."
            );

            await new Promise(
                resolve => setTimeout(resolve, 5000)
            );
        }
    }
}

app.get("/", (req, res) => {

    res.json({
        message: "Notification Service is running"
    });

});

connectRabbitMQ();

app.listen(PORT, () => {

    console.log(
        `Notification Service running on port ${PORT}`
    );

});
