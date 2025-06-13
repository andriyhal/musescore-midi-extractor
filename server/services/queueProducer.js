import amqp from "amqplib";
import dotenv from "dotenv";
dotenv.config();

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE = process.env.QUEUE;

export class QueueProducer {
    constructor(queueName = QUEUE) {
        this.queueName = queueName;
        this.connection = null;
        this.channel = null;
    }

    async connect() {
        this.connection = await amqp.connect(RABBITMQ_URL);
        this.channel = await this.connection.createConfirmChannel();
        await this.channel.assertQueue(this.queueName, { durable: true });
        console.log(`Connected to RabbitMQ queue: ${this.queueName}`);
    }

    async sendMessage(message) {
        if (!this.channel) {
            throw new Error(
                "Channel is not initialized. Call connect() first."
            );
        }
        return new Promise((resolve, reject) => {
            this.channel.sendToQueue(
                this.queueName,
                Buffer.from(message),
                { persistent: true },
                (err, ok) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(ok);
                    }
                }
            );
        });
    }

    async close() {
        if (this.connection) {
            await this.connection.close();
            console.log("RabbitMQ connection closed");
        }
    }
}
