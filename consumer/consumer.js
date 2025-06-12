import amqp from "amqplib";
const RABBITMQ_URL = process.env.RABBITMQ_URL || "amqp://localhost";

async function consume() {
    const conn = await amqp.connect(RABBITMQ_URL);
    const ch = await conn.createChannel();
    const queue = "score_links";

    await ch.assertQueue(queue, { durable: true });

    ch.consume(queue, (msg) => {
        if (msg !== null) {
            const url = msg.content.toString();
            console.log("Consumed:", url);

            // Тут парсинг або запит
            ch.ack(msg);
        }
    });
}

consume().catch(console.error);
