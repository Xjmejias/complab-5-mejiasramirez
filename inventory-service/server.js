const express = require("express");
const amqp = require("amqplib");

const app = express();

app.use(express.json());

const PORT = 4003;

const RABBITMQ_URL =
    process.env.RABBITMQ_URL ||
    "amqp://guest:guest@rabbitmq:5672";

const EXCHANGE = "orders";

// Sample inventory
const inventory = {
    Laptop: 10,
    Mouse: 25,
    Keyboard: 15,
    Monitor: 8,
    Headset: 20
};

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
                    "inventory-service",
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
                "Inventory Service connected to RabbitMQ"
            );

            channel.consume(
                queue.queue,
                async (message) => {

                    if (!message) {
                        return;
                    }

                    try {

                        const order =
                            JSON.parse(
                                message.content.toString()
                            );

                        console.log(
                            "Received order.placed:",
                            order
                        );

                        const product =
                            order.product;

                        const quantity = 1;

                        if (!inventory[product]) {

                            console.log(
                                `Product ${product} not found`
                            );

                            channel.ack(message);

                            return;
                        }

                        if (
                            inventory[product] <
                            quantity
                        ) {

                            console.log(
                                `Not enough stock for ${product}`
                            );

                            channel.ack(message);

                            return;
                        }

                        // Deduct inventory
                        inventory[product] -= quantity;

                        const inventoryEvent = {

                            orderId:
                                order.orderId,

                            product:
                                product,

                            quantity:
                                quantity,

                            remainingStock:
                                inventory[product],

                            status:
                                "RESERVED",

                            createdAt:
                                new Date().toISOString()

                        };

                        channel.publish(
                            EXCHANGE,
                            "inventory.reserved",
                            Buffer.from(
                                JSON.stringify(
                                    inventoryEvent
                                )
                            ),
                            {
                                persistent: true
                            }
                        );

                        console.log(
                            "Published inventory.reserved:",
                            inventoryEvent
                        );

                        channel.ack(message);

                    } catch (error) {

                        console.error(
                            "Processing error:",
                            error
                        );

                        channel.nack(
                            message,
                            false,
                            false
                        );
                    }
                }
            );

            break;

        } catch (error) {

            console.log(
                "RabbitMQ not ready. Retrying..."
            );

            await new Promise(
                resolve =>
                    setTimeout(resolve, 5000)
            );
        }
    }
}


// Get inventory
app.get("/inventory", (req, res) => {

    res.json({
        inventory
    });

});


// Get specific product stock
app.get(
    "/inventory/:product",
    (req, res) => {

        const product =
            req.params.product;

        if (!inventory[product]) {

            return res.status(404).json({
                error: "Product not found"
            });
        }

        res.json({
            product,
            stock: inventory[product]
        });

    }
);


app.get("/", (req, res) => {

    res.json({
        message:
            "Inventory Service is running"
    });

});


connectRabbitMQ();


app.listen(PORT, () => {

    console.log(
        `Inventory Service running on port ${PORT}`
    );

});
