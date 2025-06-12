import amqp from "amqplib";
const RABBITMQ_URL = process.env.RABBITMQ_URL;

const sitemapUrls = [...Array(1).keys()].map(
    (i) => `https://musescore.com/sitemap_scores${i}.xml`
);

async function sendMessages() {
    const conn = await amqp.connect(RABBITMQ_URL);
    const ch = await conn.createChannel();
    const queue = "score_links";

    await ch.assertQueue(queue, { durable: true });

    for (const url of sitemapUrls) {
        console.log("Sending:", url);
        //ch.sendToQueue(queue, Buffer.from(url));
    }

    setTimeout(() => conn.close(), 500);
}

sendMessages().catch(console.error);
