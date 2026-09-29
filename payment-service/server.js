const express = require("express");
const amqp = require("amqplib");

const app = express();

app.use(express.json());

const PORT = 4002;

const RABBITMQ_URL =
    process.env.RABBITMQ_URL ||
    "amqp://guest:guest@rabbitmq:5672";

const EXCHANGE = "orders";

let payments = [];


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
                    "payment-service",
                    {
                        durable: true
                    }
                );


            await channel.bindQueue(
                queue.queue,
                EXCHANGE,
                "order.placed"
            );


            console.log(
                "Payment Service connected to RabbitMQ"
            );


            channel.consume(
                queue.queue,
                async message => {

                    if (!message) {
                        return;
                    }


                    const order =
                        JSON.parse(
                            message.content.toString()
                        );


                    console.log(
                        "Received order.placed:",
                        order
                    );


                    const payment = {

                        orderId:
                            order.orderId,

                        amount:
                            order.amount,

                        status:
                            "SUCCESS",

                        processedAt:
                            new Date().toISOString()

                    };


                    payments.push(payment);


                    channel.publish(

                        EXCHANGE,

                        "payment.success",

                        Buffer.from(
                            JSON.stringify(payment)
                        ),

                        {
                            persistent: true
                        }

                    );


                    console.log(
                        "Published payment.success:",
                        payment
                    );


                    channel.ack(message);

                }
            );


            break;

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
        message: "Payment Service is running"
    });

});


app.get("/payments", (req, res) => {

    res.json(payments);

});


connectRabbitMQ();


app.listen(PORT, () => {

    console.log(
        `Payment Service running on port ${PORT}`
    );

});
